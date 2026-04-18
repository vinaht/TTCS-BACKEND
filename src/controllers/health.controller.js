const { sendSuccess } = require("../utils/apiResponse");
const { getDatabaseState } = require("../config/database");

const getHealth = (req, res) => {
    return sendSuccess(
        res,
        {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            database: getDatabaseState()
        },
        "CubeAL API health check"
    );
};

module.exports = {
    getHealth
};
