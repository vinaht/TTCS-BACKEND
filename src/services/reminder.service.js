const {
    clientUrl,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPassword,
    smtpFrom,
    reminderInactiveDays,
    reminderCooldownDays
} = require("../config/env");
const adminRepository = require("../repositories/admin.repository");
const ApiError = require("../utils/ApiError");
const { buildReminderMessage } = require("../utils/reminderMessage");

const defaultTransporterFactory = (transportOptions) => {
    // Lazy-load nodemailer so unit tests can run without touching the package.
    // eslint-disable-next-line global-require
    const nodemailer = require("nodemailer");
    return nodemailer.createTransport(transportOptions);
};

class ReminderService {
    constructor({
        repository = adminRepository,
        transporterFactory = defaultTransporterFactory
    } = {}) {
        this.repository = repository;
        this.transporterFactory = transporterFactory;
        this.transporter = null;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    isMailConfigured() {
        return Boolean(smtpHost && smtpPort && smtpFrom);
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

    async sendManualReminder({ userId, actorUserId }) {
        const transporter = this.getTransporter();
        const target = await this.repository.findReminderTargetByUserId({
            userId,
            thresholdDays: reminderInactiveDays,
            cooldownDays: reminderCooldownDays
        });

        return this.processSingleReminder({
            target,
            transporter,
            triggerType: "manual",
            actorUserId,
            thresholdDays: reminderInactiveDays,
            cooldownDays: reminderCooldownDays
        });
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

            const sentAt = new Date().toISOString();

            return {
                userId: target.id,
                status: "sent",
                message: "Reminder sent successfully.",
                email: target.email,
                inactiveDays: target.inactiveDays,
                lastReminderAt: sentAt
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
}

const reminderService = new ReminderService();

module.exports = reminderService;
module.exports.ReminderService = ReminderService;
