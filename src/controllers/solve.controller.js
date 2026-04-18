const asyncHandler = require("../middlewares/asyncHandler");
const solveService = require("../services/solve.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await solveService.getStatus();
    return sendSuccess(res, data, "Solves module ready");
});

const getAll = asyncHandler(async (req, res) => {
    const data = await solveService.getAll(req.auth.userId, req.query);
    return sendSuccess(res, data, "Solves fetched");
});

const create = asyncHandler(async (req, res) => {
    const data = await solveService.create(req.auth.userId, req.body);
    return sendSuccess(res, data, "Solve saved", 201);
});

module.exports = {
    status,
    getAll,
    create
};
