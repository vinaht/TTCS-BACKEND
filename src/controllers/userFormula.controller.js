const asyncHandler = require("../middlewares/asyncHandler");
const userFormulaService = require("../services/userFormula.service");
const { sendSuccess } = require("../utils/apiResponse");

const status = asyncHandler(async (req, res) => {
    const data = await userFormulaService.getStatus();
    return sendSuccess(res, data, "User formulas module ready");
});

const getAll = asyncHandler(async (req, res) => {
    const data = await userFormulaService.getAll(req.auth.userId, req.query);
    return sendSuccess(res, data, "User formulas fetched");
});

const create = asyncHandler(async (req, res) => {
    const data = await userFormulaService.create(req.auth.userId, req.body);
    return sendSuccess(res, data, "User formula created", 201);
});

const update = asyncHandler(async (req, res) => {
    const data = await userFormulaService.update(req.auth.userId, req.params.id, req.body);
    return sendSuccess(res, data, "User formula updated");
});

const remove = asyncHandler(async (req, res) => {
    const data = await userFormulaService.remove(req.auth.userId, req.params.id);
    return sendSuccess(res, data, "User formula deleted");
});

module.exports = {
    create,
    getAll,
    remove,
    status,
    update
};
