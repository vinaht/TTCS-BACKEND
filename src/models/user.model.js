const USER_TABLE = "users";

const REQUIRED_USER_COLUMNS = [
    "id",
    "username",
    "email",
    "password",
    "role",
    "last_login_at",
    "created_at",
    "updated_at"
];

const buildUserSelectColumns = (alias = "") => {
    const prefix = alias ? `${alias}.` : "";

    return `
        ${prefix}id,
        ${prefix}username,
        ${prefix}email,
        ${prefix}password AS password_hash,
        ${prefix}role,
        ${prefix}last_login_at,
        ${prefix}created_at,
        ${prefix}updated_at
    `;
};

const USER_SELECT_COLUMNS = buildUserSelectColumns();

const mapUserRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActivityAt: row.last_activity_at,
        inactiveDays:
            row.inactive_days === undefined || row.inactive_days === null
                ? null
                : Number(row.inactive_days),
        lastReminderAt: row.last_reminder_at || null,
        canReceiveReminder:
            row.can_receive_reminder === undefined || row.can_receive_reminder === null
                ? undefined
                : Boolean(row.can_receive_reminder)
    };
};

const toPublicUser = (user) => {
    if (!user) {
        return null;
    }

    const result = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };

    if (user.lastActivityAt !== undefined) {
        result.lastActivityAt = user.lastActivityAt || null;
    }

    if (user.inactiveDays !== undefined) {
        result.inactiveDays = user.inactiveDays;
    }

    if (user.lastReminderAt !== undefined) {
        result.lastReminderAt = user.lastReminderAt || null;
    }

    if (user.canReceiveReminder !== undefined) {
        result.canReceiveReminder = Boolean(user.canReceiveReminder);
    }

    return result;
};

module.exports = {
    USER_TABLE,
    USER_SELECT_COLUMNS,
    REQUIRED_USER_COLUMNS,
    buildUserSelectColumns,
    mapUserRow,
    toPublicUser
};
