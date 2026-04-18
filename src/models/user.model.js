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

const USER_SELECT_COLUMNS = `
    id,
    username,
    email,
    password AS password_hash,
    role,
    last_login_at,
    created_at,
    updated_at
`;

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
        updatedAt: row.updated_at
    };
};

const toPublicUser = (user) => {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};

module.exports = {
    USER_TABLE,
    USER_SELECT_COLUMNS,
    REQUIRED_USER_COLUMNS,
    mapUserRow,
    toPublicUser
};
