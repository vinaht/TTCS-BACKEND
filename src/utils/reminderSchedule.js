const ApiError = require("./ApiError");

const REMINDER_TIME_ZONE = "Asia/Saigon";
const DEFAULT_REMINDER_CRON = "0 8 * * *";

const formatterCache = new Map();

const getFormatter = (timeZone) => {
    if (!formatterCache.has(timeZone)) {
        formatterCache.set(
            timeZone,
            new Intl.DateTimeFormat("en-CA", {
                timeZone,
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
        );
    }

    return formatterCache.get(timeZone);
};

const getTimeZoneParts = (date, timeZone) => {
    const parts = getFormatter(timeZone).formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: Number(lookup.year),
        month: Number(lookup.month),
        day: Number(lookup.day),
        hour: Number(lookup.hour),
        minute: Number(lookup.minute),
        second: Number(lookup.second)
    };
};

const getTimeZoneOffsetMs = (date, timeZone) => {
    const parts = getTimeZoneParts(date, timeZone);
    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );

    return asUtc - date.getTime();
};

const zonedDateToUtc = ({ year, month, day, hour, minute, second = 0 }, timeZone) => {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = getTimeZoneOffsetMs(utcGuess, timeZone);

    return new Date(utcGuess.getTime() - offset);
};

const addLocalDays = ({ year, month, day }, days) => {
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    date.setUTCDate(date.getUTCDate() + days);

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate()
    };
};

const parseReminderCron = (expression = DEFAULT_REMINDER_CRON) => {
    const normalizedExpression = String(expression || DEFAULT_REMINDER_CRON).trim();
    const parts = normalizedExpression.split(/\s+/);

    if (parts.length !== 5) {
        throw new ApiError(500, "REMINDER_CRON must use five cron fields.");
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    if (dayOfMonth !== "*" || month !== "*" || dayOfWeek !== "*") {
        throw new ApiError(
            500,
            "REMINDER_CRON currently supports only daily schedules in the form 'm h * * *'."
        );
    }

    const parsedMinute = Number.parseInt(minute, 10);
    const parsedHour = Number.parseInt(hour, 10);

    if (
        !Number.isInteger(parsedMinute) ||
        parsedMinute < 0 ||
        parsedMinute > 59 ||
        !Number.isInteger(parsedHour) ||
        parsedHour < 0 ||
        parsedHour > 23
    ) {
        throw new ApiError(500, "REMINDER_CRON contains an invalid hour or minute.");
    }

    return {
        minute: parsedMinute,
        hour: parsedHour
    };
};

const getNextRunAt = ({ hour, minute }, now = new Date(), timeZone = REMINDER_TIME_ZONE) => {
    const currentParts = getTimeZoneParts(now, timeZone);
    const shouldUseTomorrow =
        currentParts.hour > hour ||
        (currentParts.hour === hour && currentParts.minute >= minute);
    const scheduledDate = shouldUseTomorrow ? addLocalDays(currentParts, 1) : currentParts;

    return zonedDateToUtc(
        {
            year: scheduledDate.year,
            month: scheduledDate.month,
            day: scheduledDate.day,
            hour,
            minute,
            second: 0
        },
        timeZone
    );
};

module.exports = {
    DEFAULT_REMINDER_CRON,
    REMINDER_TIME_ZONE,
    getNextRunAt,
    parseReminderCron
};
