const { getDatabasePool } = require("../src/config/database");
const { ensureLocalAdmin } = require("./seed-local-admin");
const { seedLocalAlgorithms } = require("./seed-local-algorithms");

const run = async () => {
    try {
        const admin = await ensureLocalAdmin();
        await seedLocalAlgorithms(admin);
    } finally {
        const pool = getDatabasePool();

        if (pool) {
            await pool.end();
        }
    }
};

run().catch((error) => {
    console.error(`[CubeAL seed] local demo seed failed: ${error.message}`);
    process.exitCode = 1;
});
