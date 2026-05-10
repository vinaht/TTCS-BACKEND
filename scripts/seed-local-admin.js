const bcrypt = require("bcryptjs");

const { initializeDatabase, getDatabasePool } = require("../src/config/database");
const authRepository = require("../src/repositories/auth.repository");
const { USER_TABLE } = require("../src/models/user.model");

const DEFAULT_ADMIN = {
    email: process.env.LOCAL_ADMIN_EMAIL || "admin@cubeal.local",
    username: process.env.LOCAL_ADMIN_USERNAME || "admin",
    password: process.env.LOCAL_ADMIN_PASSWORD || "Admin@123456"
};

const shouldResetPassword = () => {
    return String(process.env.LOCAL_ADMIN_RESET_PASSWORD || "false").toLowerCase() === "true";
};

const ensureLocalAdmin = async () => {
    const databaseState = await initializeDatabase();

    if (!databaseState.connected) {
        throw new Error("Database is not connected. Set DB_ENABLED=true and check DB_* values.");
    }

    await authRepository.ensureSchema();

    const existingUser = await authRepository.findUserByEmail(DEFAULT_ADMIN.email);
    const pool = getDatabasePool();

    if (!existingUser) {
        const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
        const user = await authRepository.createUser({
            username: DEFAULT_ADMIN.username,
            email: DEFAULT_ADMIN.email,
            passwordHash,
            role: "admin"
        });

        console.log(`[CubeAL seed] created local admin: ${user.email}`);
        return {
            ...user,
            created: true,
            passwordReset: true
        };
    }

    if (existingUser.role !== "admin") {
        await pool.execute(
            `UPDATE ${USER_TABLE}
             SET role = 'admin'
             WHERE id = ?`,
            [existingUser.id]
        );
    }

    let passwordReset = false;

    if (shouldResetPassword()) {
        const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
        await pool.execute(
            `UPDATE ${USER_TABLE}
             SET password = ?
             WHERE id = ?`,
            [passwordHash, existingUser.id]
        );
        passwordReset = true;
    }

    const user = await authRepository.findUserById(existingUser.id);
    console.log(
        `[CubeAL seed] local admin ready: ${user.email}${passwordReset ? " (password reset)" : ""}`
    );

    return {
        ...user,
        created: false,
        passwordReset
    };
};

const run = async () => {
    try {
        await ensureLocalAdmin();
    } finally {
        const pool = getDatabasePool();

        if (pool) {
            await pool.end();
        }
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error(`[CubeAL seed] admin seed failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    ensureLocalAdmin
};
