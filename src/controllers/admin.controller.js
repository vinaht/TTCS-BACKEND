const asyncHandler = require("../middlewares/asyncHandler");
const adminService = require("../services/admin.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    return sendSuccess(res, adminService.getStatus(), "Admin module ready");
});

const getOverview = asyncHandler(async (req, res) => {
    return sendSuccess(res, adminService.getOverview(), "Admin overview fetched");
});

module.exports = {
    status,
    getOverview
};
