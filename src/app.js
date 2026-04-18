const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");
const { clientUrl, env } = require("./config/env");

const app = express();

app.use(
    cors({
        origin: clientUrl,
        credentials: true
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env === "development" ? "dev" : "combined"));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "CubeAL backend is running",
        docs: "/api/health"
    });
});

app.use("/api", routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
