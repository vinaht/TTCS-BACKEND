require("./config/env");

const app = require("./app");
const { port, env } = require("./config/env");
const { initializeDatabase } = require("./config/database");
const authService = require("./services/auth.service");
const solveService = require("./services/solve.service");

const startServer = async () => {
    try {
        const databaseState = await initializeDatabase();

        if (databaseState.connected) {
            await authService.initialize();
            await solveService.initialize();
        }

        app.listen(port, () => {
            console.log(
                `[CubeAL API] running on port ${port} in ${env} mode | database: ${databaseState.message}`
            );
        });
    } catch (error) {
        console.error(`[CubeAL API] startup failed: ${error.message}`);
        process.exit(1);
    }
};

startServer();
