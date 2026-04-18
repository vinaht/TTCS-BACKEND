const { getDatabaseState } = require("../config/database");

const createPendingRepository = (moduleName) => ({
    getMeta() {
        const databaseState = getDatabaseState();

        return {
            module: moduleName,
            storage: databaseState.connected ? "mysql" : "database-pending",
            ready: databaseState.connected,
            database: databaseState
        };
    }
});

module.exports = {
    createPendingRepository
};
