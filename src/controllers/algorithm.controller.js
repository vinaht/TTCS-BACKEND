const asyncHandler = require("../middlewares/asyncHandler");
const algorithmService = require("../services/algorithm.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await algorithmService.getStatus();
    return sendSuccess(res, data, "Algorithms module ready");
});

const getAll = asyncHandler(async (req, res) => {
    const data = await algorithmService.getAll(req.query);
    return sendSuccess(res, data, "Algorithms fetched");
});

const getById = asyncHandler(async (req, res) => {
    const data = await algorithmService.getById(req.params.id);
    return sendSuccess(res, data, "Algorithm fetched");
});

module.exports = {
    status,
    getAll,
    getById
};
