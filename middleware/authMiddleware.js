const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        // 1) Getting token and check if it's there
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                status: "fail",
                message: "Vous n'êtes pas connecté. Veuillez vous connecter pour accéder.",
            });
        }

        // 2) Verification token
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);

        // 3) Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: "fail",
                message: "L'utilisateur appartenant à ce jeton n'existe plus.",
            });
        }

        // 4) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                status: "fail",
                message: "L'utilisateur a récemment changé son mot de passe. Veuillez vous reconnecter.",
            });
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        next();
    } catch (err) {
        return res.status(401).json({
            status: "fail",
            message: "Jeton invalide ou expiré. Veuillez vous connecter.",
        });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['ADMIN', 'USER']. role='USER'
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: "fail",
                message: "Vous n'avez pas la permission d'effectuer cette action.",
            });
        }

        next();
    };
};

module.exports = { protect, restrictTo };
