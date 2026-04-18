const asyncHandler = require("../middlewares/asyncHandler");
const statService = require("../services/stat.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await statService.getStatus();
    return sendSuccess(res, data, "Stats module ready");
});

const getOverview = asyncHandler(async (req, res) => {
    const data = await statService.getOverview(req.auth.userId);
    return sendSuccess(res, data, "Stats fetched");
});

module.exports = {
    status,
    getOverview
};
