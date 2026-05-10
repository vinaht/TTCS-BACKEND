const statRepository = require("../repositories/stat.repository");
const {
    calculateAverageWindow,
    toPublicSolve
} = require("../models/solve.model");

const toSeconds = (timeMs) => {
    if (timeMs === null) {
        return null;
    }

    return Number((timeMs / 1000).toFixed(2));
};

class StatService {
    async getStatus() {
        const initialMeta = statRepository.getMeta();

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                plannedEndpoints: ["GET /"]
            };
        }

        await statRepository.ensureSchema();

        return {
            ...statRepository.getMeta(),
            plannedEndpoints: ["GET /"]
        };
    }

    async getOverview(userId) {
        await statRepository.ensureSchema();

        const [summary, recentSolves] = await Promise.all([
            statRepository.getSolveSummaryByUserId(userId),
            statRepository.listRecentSolvesByUserId(userId, 12)
        ]);

        const ao5Window = recentSolves.slice(0, 5);
        const ao12Window = recentSolves.slice(0, 12);
        const bestTimeMs =
            summary?.best_time_ms === null || summary?.best_time_ms === undefined
                ? null
                : Math.round(Number(summary.best_time_ms));
        const averageTimeMs =
            summary?.average_time_ms === null || summary?.average_time_ms === undefined
                ? null
                : Math.round(Number(summary.average_time_ms));
        const ao5Ms = ao5Window.length >= 5 ? calculateAverageWindow(ao5Window) : null;
        const ao12Ms = ao12Window.length >= 12 ? calculateAverageWindow(ao12Window) : null;

        return {
            totalSolves: Number(summary?.total_solves || 0),
            completedSolves: Number(summary?.completed_solves || 0),
            bestTimeMs,
            bestTimeSeconds: toSeconds(bestTimeMs),
            averageTimeMs,
            averageTimeSeconds: toSeconds(averageTimeMs),
            ao5Ms,
            ao5Seconds: toSeconds(ao5Ms),
            ao12Ms,
            ao12Seconds: toSeconds(ao12Ms),
            latestSolve: toPublicSolve(recentSolves[0] || null),
            recentSolves: recentSolves.slice(0, 12).map(toPublicSolve)
        };
    }
}

module.exports = new StatService();
