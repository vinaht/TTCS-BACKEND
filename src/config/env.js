const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

module.exports = {
    env: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 5000,
    clientUrl: process.env.CLIENT_URL || "http://localhost:5500",
    jwtSecret: process.env.JWT_SECRET || "change_this_secret",
    dbEnabled: process.env.DB_ENABLED === "true",
    dbHost: process.env.DB_HOST || "localhost",
    dbPort: Number(process.env.DB_PORT) || 3306,
    dbUser: process.env.DB_USER || "root",
    dbPassword: process.env.DB_PASSWORD || "",
    dbName: process.env.DB_NAME || "cubeal",
    dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
};
