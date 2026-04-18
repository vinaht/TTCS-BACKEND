const ApiError = require("../utils/ApiError");

const notFoundMiddleware = (req, res, next) => {
    next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

module.exports = notFoundMiddleware;
