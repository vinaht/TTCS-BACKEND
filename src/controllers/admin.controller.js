const asyncHandler = require("../middlewares/asyncHandler");
const adminService = require("../services/admin.service");
const algorithmService = require("../services/algorithm.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await adminService.getStatus();
    return sendSuccess(res, data, "Admin module ready");
});

const getOverview = asyncHandler(async (req, res) => {
    const data = await adminService.getOverview();
    return sendSuccess(res, data, "Admin overview fetched");
});

const listAlgorithms = asyncHandler(async (req, res) => {
    const data = await algorithmService.getAll(req.query, { isAdmin: true });
    return sendSuccess(res, data, "Algorithms fetched");
});

const getAlgorithm = asyncHandler(async (req, res) => {
    const data = await algorithmService.getById(req.params.id, { isAdmin: true });
    return sendSuccess(res, data, "Algorithm fetched");
});

const createAlgorithm = asyncHandler(async (req, res) => {
    const data = await algorithmService.create(req.body, req.auth.userId);
    return sendSuccess(res, data, "Algorithm created", 201);
});

const updateAlgorithm = asyncHandler(async (req, res) => {
    const data = await algorithmService.update(req.params.id, req.body, req.auth.userId);
    return sendSuccess(res, data, "Algorithm updated");
});

const deleteAlgorithm = asyncHandler(async (req, res) => {
    const data = await algorithmService.remove(req.params.id);
    return sendSuccess(res, data, "Algorithm deleted");
});

const uploadImage = asyncHandler(async (req, res) => {
    return sendSuccess(res, { url: req.uploadedImageUrl }, "Image uploaded", 201);
});

const listUsers = asyncHandler(async (req, res) => {
    const data = await adminService.listUsers(req.query);
    return sendSuccess(res, data, "Users fetched");
});

const getUser = asyncHandler(async (req, res) => {
    const data = await adminService.getUserById(req.params.id);
    return sendSuccess(res, data, "User fetched");
});

const updateUser = asyncHandler(async (req, res) => {
    const data = await adminService.updateUser(req.params.id, req.body);
    return sendSuccess(res, data, "User updated");
});

module.exports = {
    status,
    getOverview,
    listAlgorithms,
    getAlgorithm,
    createAlgorithm,
    updateAlgorithm,
    deleteAlgorithm,
    uploadImage,
    listUsers,
    getUser,
    updateUser
};
