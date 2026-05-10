const {
    clientUrl,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    smtpFrom,
    reminderInactiveDays,
    reminderCooldownDays,
    reminderCron
} = require("../config/env");
const adminRepository = require("../repositories/admin.repository");
const ApiError = require("../utils/ApiError");
const { buildReminderMessage } = require("../utils/reminderMessage");
const {
    DEFAULT_REMINDER_CRON,
    getNextRunAt,
    parseReminderCron
} = require("../utils/reminderSchedule");

const defaultTransporterFactory = (transportOptions) => {
    // Lazy-load nodemailer so unit tests can run without touching the package.
    // eslint-disable-next-line global-require
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport(transportOptions);
};

class ReminderService {
    constructor({
        repository = adminRepository,
        transporterFactory = defaultTransporterFactory,
        logger = console,
        timeoutFactory = setTimeout,
        clearScheduledTimeout = clearTimeout
    } = {}) {
        this.repository = repository;
        this.transporterFactory = transporterFactory;
        this.logger = logger;
        this.timeoutFactory = timeoutFactory;
        this.clearScheduledTimeout = clearScheduledTimeout;
        this.transporter = null;
        this.schedulerHandle = null;
        this.schedulerEnabled = false;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    isMailConfigured() {
        return Boolean(smtpHost && smtpPort && smtpFrom);
    }

    isSchedulerRunning() {
        return this.schedulerEnabled;
    }

    getTransporter() {
        if (!this.isMailConfigured()) {
            throw new ApiError(503, "SMTP is not configured for reminder emails.");
        }

        if (!this.transporter) {
            const transportOptions = {
                host: smtpHost,
                port: smtpPort,
                secure: Number(smtpPort) === 465
            };

            if (smtpUser || smtpPassword) {
                transportOptions.auth = {
                    user: smtpUser,
                    pass: smtpPassword
                };
            }

            this.transporter = this.transporterFactory(transportOptions);
        }

        return this.transporter;
    }

    async runAutomaticReminders() {
        if (!this.isMailConfigured()) {
            return {
                requested: 0,
                sent: 0,
                skipped: 0,
                failed: 0,
                results: []
            };
        }

        return this.sendReminders({
            triggerType: "auto",
            actorUserId: null,
            thresholdDays: reminderInactiveDays,
            cooldownDays: reminderCooldownDays
        });
    }

    async sendReminders({
        triggerType,
        actorUserId = null,
        thresholdDays,
        cooldownDays
    }) {
        const transporter = this.getTransporter();
        const targets = await this.repository.listEligibleAutoReminderTargets({
            thresholdDays,
            cooldownDays
        });
        const results = [];
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        if (targets.length === 0) {
            await this.repository.createReminderLog({
                triggerType,
                sentBy: actorUserId,
                status: "noop",
                errorMessage: "No eligible inactive users."
            });
        }

        for (const target of targets) {
            const result = await this.processSingleReminder({
                target,
                transporter,
                triggerType,
                actorUserId,
                thresholdDays,
                cooldownDays
            });

            results.push(result);

            if (result.status === "sent") {
                sent += 1;
            } else if (result.status === "skipped") {
                skipped += 1;
            } else {
                failed += 1;
            }
        }

        return {
            requested: targets.length,
            sent,
            skipped,
            failed,
            results
        };
    }

    async processSingleReminder({
        target,
        transporter,
        triggerType,
        actorUserId,
        thresholdDays,
        cooldownDays
    }) {
        if (!target || !target.id || !target.email) {
            await this.repository.createReminderLog({
                triggerType,
                sentBy: actorUserId,
                status: "failed",
                errorMessage: `Requested user ${target?.id || "unknown"} was not found.`
            });

            return {
                userId: target?.id || null,
                status: "failed",
                message: "User not found.",
                email: target?.email || null,
                inactiveDays: target?.inactiveDays || null,
                lastReminderAt: target?.lastReminderAt || null
            };
        }

        if ((target.inactiveDays || 0) < thresholdDays) {
            await this.repository.createReminderLog({
                userId: target.id,
                triggerType,
                sentBy: actorUserId,
                inactiveDays: target.inactiveDays,
                status: "skipped",
                errorMessage: `User has been inactive for less than ${thresholdDays} days.`
            });

            return {
                userId: target.id,
                status: "skipped",
                message: `User has been inactive for less than ${thresholdDays} days.`,
                email: target.email,
                inactiveDays: target.inactiveDays,
                lastReminderAt: target.lastReminderAt
            };
        }

        if (target.lastReminderAt && target.canReceiveReminder === false) {
            await this.repository.createReminderLog({
                userId: target.id,
                triggerType,
                sentBy: actorUserId,
                inactiveDays: target.inactiveDays,
                status: "skipped",
                errorMessage: `Reminder was already sent within the last ${cooldownDays} days.`
            });

            return {
                userId: target.id,
                status: "skipped",
                message: `Reminder was already sent within the last ${cooldownDays} days.`,
                email: target.email,
                inactiveDays: target.inactiveDays,
                lastReminderAt: target.lastReminderAt
            };
        }

        const message = buildReminderMessage(target, clientUrl);

        try {
            await transporter.sendMail({
                from: smtpFrom,
                to: target.email,
                subject: message.subject,
                text: message.text,
                html: message.html
            });

            await this.repository.createReminderLog({
                userId: target.id,
                triggerType,
                sentBy: actorUserId,
                inactiveDays: target.inactiveDays,
                status: "sent"
            });

            return {
                userId: target.id,
                status: "sent",
                message: "Reminder sent successfully.",
                email: target.email,
                inactiveDays: target.inactiveDays,
                lastReminderAt: target.lastReminderAt
            };
        } catch (error) {
            await this.repository.createReminderLog({
                userId: target.id,
                triggerType,
                sentBy: actorUserId,
                inactiveDays: target.inactiveDays,
                status: "failed",
                errorMessage: error.message
            });

            return {
                userId: target.id,
                status: "failed",
                message: error.message,
                email: target.email,
                inactiveDays: target.inactiveDays,
                lastReminderAt: target.lastReminderAt
            };
        }
    }

    startScheduler() {
        if (this.schedulerEnabled || !this.isMailConfigured()) {
            return;
        }

        this.schedulerEnabled = true;
        this.scheduleNextRun();
    }

    stopScheduler() {
        if (this.schedulerHandle) {
            this.clearScheduledTimeout(this.schedulerHandle);
            this.schedulerHandle = null;
        }

        this.schedulerEnabled = false;
    }

    scheduleNextRun() {
        if (!this.schedulerEnabled) {
            return;
        }

        let scheduleConfig;

        try {
            scheduleConfig = parseReminderCron(reminderCron);
        } catch (error) {
            this.logger.warn?.(
                `[CubeAL reminders] ${error.message}. Falling back to ${DEFAULT_REMINDER_CRON}.`
            );
            scheduleConfig = parseReminderCron(DEFAULT_REMINDER_CRON);
        }

        const nextRunAt = getNextRunAt(scheduleConfig);
        const delay = Math.max(1000, nextRunAt.getTime() - Date.now());

        // Keep only one scheduled job alive, then schedule the next one after it finishes.
        this.schedulerHandle = this.timeoutFactory(async () => {
            try {
                await this.runAutomaticReminders();
            } catch (error) {
                this.logger.error?.(`[CubeAL reminders] auto reminder failed: ${error.message}`);
            } finally {
                this.scheduleNextRun();
            }
        }, delay);
    }
}

const reminderService = new ReminderService();

module.exports = reminderService;
module.exports.ReminderService = ReminderService;
module.exports.parseReminderCron = parseReminderCron;
module.exports.getNextRunAt = getNextRunAt;
