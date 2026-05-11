const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
    path: path.resolve(__dirname, "../../.env")
});

const defaultClientUrls = ["http://localhost:5500", "http://127.0.0.1:5500"];
const nodeEnv = process.env.NODE_ENV || "development";

const parseClientUrls = () => {
    const hasExplicitClientUrls = Boolean(process.env.CLIENT_URLS);
    const rawValue = process.env.CLIENT_URLS || process.env.CLIENT_URL || defaultClientUrls.join(",");
    const urls = rawValue
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

    if (!hasExplicitClientUrls && nodeEnv !== "production") {
        defaultClientUrls.forEach((url) => {
            if (!urls.includes(url)) {
                urls.push(url);
            }
        });
    }

    return urls.length > 0 ? urls : defaultClientUrls;
};

const clientUrls = parseClientUrls();

module.exports = {
    env: nodeEnv,
    port: Number(process.env.PORT) || 5000,
    clientUrl: clientUrls[0],
    clientUrls,
    jwtSecret: process.env.JWT_SECRET || "change_this_secret",
    dbEnabled: process.env.DB_ENABLED === "true",
    dbHost: process.env.DB_HOST || "localhost",
    dbPort: Number(process.env.DB_PORT) || 3306,
    dbUser: process.env.DB_USER || "root",
    dbPassword: process.env.DB_PASSWORD || "",
    dbName: process.env.DB_NAME || "cubeal",
    dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || "",
    smtpPassword: process.env.SMTP_PASSWORD || "",
    smtpFrom: process.env.SMTP_FROM || "",
    reminderInactiveDays: Number(process.env.REMINDER_INACTIVE_DAYS) || 60,
    reminderCooldownDays: Number(process.env.REMINDER_COOLDOWN_DAYS) || 7
};
