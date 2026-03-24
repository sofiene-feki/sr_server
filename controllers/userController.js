const User = require("../models/User");

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({
            status: "success",
            results: users.length,
            data: {
                users,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.getUser = async (req, res, next) => {
    try {
        console.log("🔍 Admin Management Debug - req.params:", req.params);
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "Utilisateur non trouvé.",
            });
        }
        res.status(200).json({
            status: "success",
            data: {
                user,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const newUser = await User.create({
            fullName: req.body.fullName,
            email: req.body.email,
            password: req.body.password,
            phoneNumber: req.body.phoneNumber,
            isActive: req.body.isActive === undefined ? true : req.body.isActive,
            role: req.body.role || "USER",
            isEmailVerified: true,
        });

        newUser.password = undefined;

        res.status(201).json({
            status: "success",
            data: {
                user: newUser,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).select("-password");

        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "Utilisateur non trouvé.",
            });
        }

        res.status(200).json({
            status: "success",
            data: {
                user,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: "fail",
                message: "Utilisateur non trouvé.",
            });
        }

        res.status(204).json({
            status: "success",
            data: null,
        });
    } catch (err) {
        res.status(400).json({
            status: "fail",
            message: err.message,
        });
    }
};
