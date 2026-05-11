const test = require("node:test");
const assert = require("node:assert/strict");

const { ReminderService } = require("../src/services/reminder.service");

test("ReminderService manual send delivers to an eligible inactive user", async () => {
    const sentMessages = [];
    const logs = [];
    const service = new ReminderService({
        repository: {
            findReminderTargetByUserId: async (filters) => {
                assert.equal(filters.userId, 1);

                return {
                    id: 1,
                    username: "eligible",
                    email: "eligible@example.com",
                    inactiveDays: 90,
                    lastReminderAt: null,
                    canReceiveReminder: true
                };
            },
            createReminderLog: async (entry) => {
                logs.push(entry);
            }
        },
        transporterFactory: () => ({
            sendMail: async (message) => {
                sentMessages.push(message);
            }
        })
    });

    service.isMailConfigured = () => true;

    const result = await service.sendManualReminder({
        userId: 1,
        actorUserId: 99
    });

    assert.equal(result.status, "sent");
    assert.equal(result.userId, 1);
    assert.equal(sentMessages.length, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].triggerType, "manual");
    assert.equal(logs[0].sentBy, 99);
});

test("ReminderService manual send rejects unknown users defensively", async () => {
    const logs = [];
    const service = new ReminderService({
        repository: {
            findReminderTargetByUserId: async () => null,
            createReminderLog: async (entry) => {
                logs.push(entry);
            }
        },
        transporterFactory: () => ({
            sendMail: async () => {
                throw new Error("sendMail should not be called");
            }
        })
    });

    service.isMailConfigured = () => true;

    const result = await service.sendManualReminder({
        userId: 404,
        actorUserId: 15
    });

    assert.equal(result.status, "failed");
    assert.equal(result.message, "User not found.");
    assert.equal(logs.length, 1);
    assert.equal(logs[0].triggerType, "manual");
    assert.equal(logs[0].status, "failed");
});

test("ReminderService manual send skips users in cooldown", async () => {
    const logs = [];
    const service = new ReminderService({
        repository: {
            findReminderTargetByUserId: async () => ({
                id: 2,
                username: "cooldown",
                email: "cooldown@example.com",
                inactiveDays: 88,
                lastReminderAt: "2026-04-20T00:00:00.000Z",
                canReceiveReminder: false
            }),
            createReminderLog: async (entry) => {
                logs.push(entry);
            }
        },
        transporterFactory: () => ({
            sendMail: async (message) => {
                throw new Error(`sendMail should not be called for ${message.to}`);
            }
        })
    });

    service.isMailConfigured = () => true;

    const result = await service.sendManualReminder({
        userId: 2,
        actorUserId: 11
    });

    assert.equal(result.status, "skipped");
    assert.match(result.message, /last 7 days/i);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "skipped");
});

test("ReminderService manual send skips users below the inactivity threshold", async () => {
    const logs = [];
    const service = new ReminderService({
        repository: {
            findReminderTargetByUserId: async () => ({
                id: 3,
                username: "fresh",
                email: "fresh@example.com",
                inactiveDays: 20,
                lastReminderAt: null,
                canReceiveReminder: false
            }),
            createReminderLog: async (entry) => {
                logs.push(entry);
            }
        },
        transporterFactory: () => ({
            sendMail: async (message) => {
                throw new Error(`sendMail should not be called for ${message.to}`);
            }
        })
    });

    service.isMailConfigured = () => true;

    const result = await service.sendManualReminder({
        userId: 3,
        actorUserId: 11
    });

    assert.equal(result.status, "skipped");
    assert.match(result.message, /less than 60 days/i);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, "skipped");
});

test("ReminderService manual send fails fast when SMTP is not configured", async () => {
    const service = new ReminderService({
        repository: {
            findReminderTargetByUserId: async () => {
                throw new Error("findReminderTargetByUserId should not be called");
            }
        },
        transporterFactory: () => ({
            sendMail: async () => {
                throw new Error("sendMail should not be called");
            }
        })
    });

    service.isMailConfigured = () => false;

    await assert.rejects(
        () =>
            service.sendManualReminder({
                userId: 1,
                actorUserId: 2
            }),
        (error) => {
            assert.equal(error.statusCode, 503);
            assert.match(error.message, /SMTP is not configured/i);
            return true;
        }
    );
});
