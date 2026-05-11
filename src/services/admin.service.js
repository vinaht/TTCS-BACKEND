const adminRepository = require("../repositories/admin.repository");
const algorithmRepository = require("../repositories/algorithm.repository");
const reminderService = require("./reminder.service");
const { toPublicUser } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const { createListResponse } = require("../utils/listResponse");
const { reminderInactiveDays, reminderCooldownDays } = require("../config/env");
const {
    normalizeBoolean,
    normalizeLimit,
    normalizeOptionalText,
    normalizePage,
    normalizeRequiredText,
    requirePositiveInteger
} = require("../utils/validators");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const ALLOWED_ROLES = new Set(["user", "admin"]);

const normalizeId = (value, fieldName = "User id") => requirePositiveInteger(value, fieldName);

const normalizeEmail = (value) => {
    const normalizedValue = normalizeRequiredText(value, "Email", 191).toLowerCase();

    if (!EMAIL_REGEX.test(normalizedValue)) {
        throw new ApiError(400, "Email format is invalid.");
    }

    return normalizedValue;
};

const normalizeRole = (value) => {
    const normalizedValue = normalizeRequiredText(value, "Role", 20).toLowerCase();

    if (!ALLOWED_ROLES.has(normalizedValue)) {
        throw new ApiError(400, "Role must be either user or admin.");
    }

    return normalizedValue;
};

const isValidDate = (value) => {
    if (!value) {
        return false;
    }

    const parsedValue = new Date(value);
    return !Number.isNaN(parsedValue.getTime());
};

const buildReminderState = (user) => {
    const inactiveDays = Number(user?.inactiveDays);

    if (!Number.isFinite(inactiveDays) || inactiveDays < reminderInactiveDays) {
        return {
            canReceiveReminder: false,
            reminderBlockedReason: `User has been inactive for less than ${reminderInactiveDays} days.`
        };
    }

    if (!isValidDate(user?.lastReminderAt)) {
        return {
            canReceiveReminder: true,
            reminderBlockedReason: null
        };
    }

    const lastReminderAt = new Date(user.lastReminderAt);
    const cooldownDeadline = new Date(lastReminderAt.getTime());
    cooldownDeadline.setDate(cooldownDeadline.getDate() + reminderCooldownDays);

    if (cooldownDeadline.getTime() > Date.now()) {
        return {
            canReceiveReminder: false,
            reminderBlockedReason: `Reminder was already sent within the last ${reminderCooldownDays} days.`
        };
    }

    return {
        canReceiveReminder: true,
        reminderBlockedReason: null
    };
};

const toReminderAwarePublicUser = (user) => {
    if (!user) {
        return null;
    }

    return toPublicUser({
        ...user,
        ...buildReminderState(user)
    });
};

class AdminService {
    constructor({
        repository = adminRepository,
        algorithmRepo = algorithmRepository,
        reminders = reminderService
    } = {}) {
        this.repository = repository;
        this.algorithmRepository = algorithmRepo;
        this.reminderService = reminders;
    }

    async initialize() {
        await this.repository.ensureSchema();
    }

    async getStatus() {
        const initialMeta = this.repository.getMeta();
        const plannedEndpoints = [
            "GET /",
            "GET /algorithms",
            "GET /users"
        ];

        if (!initialMeta.storage || initialMeta.storage === "database-pending") {
            return {
                ...initialMeta,
                plannedEndpoints,
                mailConfigured: this.reminderService.isMailConfigured()
            };
        }

        await this.repository.ensureSchema();

        return {
            ...this.repository.getMeta(),
            plannedEndpoints,
            mailConfigured: this.reminderService.isMailConfigured()
        };
    }

    async getOverview() {
        await Promise.all([this.repository.ensureSchema(), this.algorithmRepository.ensureSchema()]);

        const [counts, totalAlgorithms] = await Promise.all([
            this.repository.getUserOverviewCounts(reminderInactiveDays),
            this.algorithmRepository.countAlgorithms()
        ]);

        return {
            totalUsers: Number(counts?.total_users || 0),
            totalAlgorithms: Number(totalAlgorithms || 0),
            activeUsers60d: Number(counts?.active_users || 0),
            inactiveUsers60d: Number(counts?.inactive_users || 0)
        };
    }

    async listUsers(query = {}) {
        const page = normalizePage(query.page);
        const limit = normalizeLimit(query.limit, {
            defaultValue: DEFAULT_LIMIT,
            maxValue: MAX_LIMIT
        });
        const result = await this.repository.listUsers({
            page,
            limit,
            search: normalizeOptionalText(query.search, "Search", 100),
            role: query.role ? normalizeRole(query.role) : undefined,
            inactive: normalizeBoolean(query.inactive, "inactive"),
            inactiveThresholdDays: reminderInactiveDays
        });

        return createListResponse({
            items: result.items.map(toReminderAwarePublicUser),
            page,
            limit,
            total: result.total
        });
    }

    async getUserById(userId) {
        const user = await this.repository.findUserById(normalizeId(userId));

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        return toReminderAwarePublicUser(user);
    }

    async updateUser(userId, payload = {}) {
        const normalizedUserId = normalizeId(userId);
        const updates = {};

        if (payload.username !== undefined) {
            updates.username = normalizeRequiredText(payload.username, "Username", 50);
        }

        if (payload.email !== undefined) {
            updates.email = normalizeEmail(payload.email);
        }

        if (payload.role !== undefined) {
            updates.role = normalizeRole(payload.role);
        }

        if (Object.keys(updates).length === 0) {
            throw new ApiError(400, "At least one user field must be provided.");
        }

        const user = await this.repository.updateUser(normalizedUserId, updates);

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        return toReminderAwarePublicUser(user);
    }

    async sendManualReminder(userId, actorUserId) {
        const normalizedUserId = normalizeId(userId);
        const normalizedActorUserId = normalizeId(actorUserId, "Admin user id");

        return this.reminderService.sendManualReminder({
            userId: normalizedUserId,
            actorUserId: normalizedActorUserId
        });
    }

}

const adminService = new AdminService();

module.exports = adminService;
module.exports.AdminService = AdminService;
