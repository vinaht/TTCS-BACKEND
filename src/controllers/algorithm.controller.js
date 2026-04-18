const asyncHandler = require("../middlewares/asyncHandler");
const algorithmService = require("../services/algorithm.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.getStatus(), "Algorithms module ready");
});

const getAll = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.getAll(), "Algorithms fetched");
});

const getById = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.getById(req.params.id), "Algorithm fetched");
});

const create = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.create(req.body), "Algorithm created", 201);
});

const update = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.update(req.params.id, req.body), "Algorithm updated");
});

const remove = asyncHandler(async (req, res) => {
    return sendSuccess(res, algorithmService.remove(req.params.id), "Algorithm deleted");
});

module.exports = {
    status,
    getAll,
    getById,
    create,
    update,
    remove
};
