const jwt = require("jsonwebtoken");

const signToken = (id, secret, expires) => {
    return jwt.sign({ id }, secret, {
        expiresIn: expires,
    });
};

const createSendToken = (user, statusCode, res) => {
    const accessToken = signToken(user._id, process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRES_IN);
    const refreshToken = signToken(user._id, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    };

    res.cookie("refreshToken", refreshToken, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        accessToken,
        data: {
            user,
        },
    });
};

module.exports = { signToken, createSendToken };
