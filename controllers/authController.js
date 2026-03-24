const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/email");
const { createSendToken, signToken } = require("../utils/tokens");

exports.register = async (req, res, next) => {
    try {
        const newUser = await User.create({
            fullName: req.body.fullName,
            email: req.body.email,
            password: req.body.password,
            isEmailVerified: true, // BYPASS VERIFICATION FOR NOW
        });

        // Skip actual email sending until SMTP is configured
        console.log("🚀 User registered without email verification (Dev Mode)");

        // Automatically log in after registration
        createSendToken(newUser, 201, res);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                status: "fail",
                message: "Cet email est déjà utilisé.",
            });
        }
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
        });

        if (!user) {
            return res.status(400).json({
                status: "fail",
                message: "Le jeton est invalide ou a expiré.",
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            status: "success",
            message: "Email vérifié avec succès ! Vous pouvez maintenant vous connecter.",
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: "fail",
                message: "Veuillez fournir un email et un mot de passe.",
            });
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                status: "fail",
                message: "Email ou mot de passe incorrect.",
            });
        }

        // Check if user is active
        if (user.isActive === false) {
            return res.status(403).json({
                status: "fail",
                message: "Votre compte a été désactivé. Veuillez contacter l'administrateur.",
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save({ validateBeforeSave: false });

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.logout = (req, res) => {
    res.cookie("refreshToken", "loggedout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ status: "success" });
};

exports.refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                status: "fail",
                message: "Vous n'êtes pas connecté.",
            });
        }

        const decoded = await promisify(jwt.verify)(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: "fail",
                message: "L'utilisateur n'existe plus.",
            });
        }

        const accessToken = signToken(user._id, process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRES_IN);

        res.status(200).json({
            status: "success",
            accessToken,
        });
    } catch (err) {
        res.status(401).json({
            status: "fail",
            message: "Jeton de rafraîchissement invalide.",
        });
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "Il n'y a pas d'utilisateur avec cette adresse email.",
            });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const resetURL = `${req.get("origin")}/reset-password/${resetToken}`;

        // Log to console for development bypass
        console.log("🔗 Reset Password Link:", resetURL);

        res.status(200).json({
            status: "success",
            message: "Dev Mode: Le lien de réinitialisation a été généré (voir la console serveur).",
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                status: "fail",
                message: "Le jeton est invalide ou a expiré.",
            });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.updatePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("+password");

        if (!(await user.comparePassword(req.body.passwordCurrent))) {
            return res.status(401).json({
                status: "fail",
                message: "Le mot de passe actuel est incorrect.",
            });
        }

        user.password = req.body.password;
        await user.save();

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getMe = (req, res) => {
    res.status(200).json({
        status: "success",
        data: {
            user: req.user,
        },
    });
};
