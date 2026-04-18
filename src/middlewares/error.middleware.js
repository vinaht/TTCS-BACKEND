const { env } = require("../config/env");

const errorMiddleware = (error, req, res, next) => {
    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
        ...(env === "development" ? { stack: error.stack } : {})
    });
};

module.exports = errorMiddleware;
