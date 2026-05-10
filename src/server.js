require("./config/env");

const app = require("./app");
const { port, env } = require("./config/env");
const { initializeDatabase } = require("./config/database");
const authService = require("./services/auth.service");
const solveService = require("./services/solve.service");
const algorithmService = require("./services/algorithm.service");
const adminService = require("./services/admin.service");
const reminderService = require("./services/reminder.service");
const userFormulaService = require("./services/userFormula.service");

const startServer = async () => {
    try {
        const databaseState = await initializeDatabase();

        if (databaseState.connected) {
            await authService.initialize();
            await solveService.initialize();
            await algorithmService.initialize();
            await adminService.initialize();
            await reminderService.initialize();
            await userFormulaService.initialize();
        }

        app.listen(port, () => {
            console.log(
                `[CubeAL API] running on port ${port} in ${env} mode | database: ${databaseState.message}`
            );

            if (databaseState.connected) {
                reminderService.startScheduler();
            }
        });
    } catch (error) {
        console.error(`[CubeAL API] startup failed: ${error.message}`);
        process.exit(1);
    }
};

startServer();
