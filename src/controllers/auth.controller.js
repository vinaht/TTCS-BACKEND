const asyncHandler = require("../middlewares/asyncHandler");
const authService = require("../services/auth.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await authService.getStatus();
    return sendSuccess(res, data, "Auth module ready");
});

const me = asyncHandler(async (req, res) => {
    const data = await authService.getCurrentUser(req.auth.userId);
    return sendSuccess(res, data, "Current user fetched");
});

const register = asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    return sendSuccess(res, data, "Register successful", 201);
});

const login = asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    return sendSuccess(res, data, "Login successful");
});

module.exports = {
    me,
    status,
    register,
    login
};
