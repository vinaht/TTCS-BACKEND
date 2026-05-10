const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ReminderService,
    parseReminderCron,
    getNextRunAt
} = require("../src/services/reminder.service");

test("ReminderService automatic run sends eligible inactive users", async () => {
    const sentMessages = [];
    const logs = [];
    let query;
    const service = new ReminderService({
        repository: {
            listEligibleAutoReminderTargets: async (filters) => {
                query = filters;
                return [
                    {
                        id: 1,
                        username: "eligible",
                        email: "eligible@example.com",
                        inactiveDays: 90,
                        lastReminderAt: null,
                        canReceiveReminder: true
                    }
                ];
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

    const result = await service.runAutomaticReminders();

    assert.equal(result.requested, 1);
    assert.equal(result.sent, 1);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 0);
    assert.equal(sentMessages.length, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].triggerType, "auto");
    assert.equal(logs[0].sentBy, null);
    assert.equal(Number.isInteger(query.thresholdDays), true);
    assert.equal(Number.isInteger(query.cooldownDays), true);
});

test("ReminderService automatic run noops when there are no eligible users", async () => {
    const logs = [];
    const service = new ReminderService({
        repository: {
            listEligibleAutoReminderTargets: async () => [],
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

    const result = await service.runAutomaticReminders();

    assert.equal(result.requested, 0);
    assert.equal(result.sent, 0);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 0);
    assert.deepEqual(result.results, []);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].triggerType, "auto");
    assert.equal(logs[0].status, "noop");
});

test("ReminderService direct auto processing still rejects ineligible targets defensively", async () => {
    const sentMessages = [];
    const logs = [];
    const service = new ReminderService({
        repository: {
            listEligibleAutoReminderTargets: async () => [
                {
                    id: 2,
                    username: "cooldown",
                    email: "cooldown@example.com",
                    inactiveDays: 88,
                    lastReminderAt: "2026-04-20T00:00:00.000Z",
                    canReceiveReminder: false
                },
                {
                    id: 3,
                    username: "fresh",
                    email: "fresh@example.com",
                    inactiveDays: 20,
                    lastReminderAt: null,
                    canReceiveReminder: false
                }
            ],
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

    const result = await service.sendReminders({
        triggerType: "auto",
        actorUserId: null,
        thresholdDays: 60,
        cooldownDays: 7
    });

    assert.equal(result.requested, 2);
    assert.equal(result.sent, 0);
    assert.equal(result.skipped, 2);
    assert.equal(result.failed, 0);
    assert.equal(sentMessages.length, 0);
    assert.equal(logs.length, 2);
    assert.equal(result.results[0].status, "skipped");
    assert.match(result.results[0].message, /last 7 days/i);
    assert.equal(result.results[1].status, "skipped");
    assert.match(result.results[1].message, /less than 60 days/i);
});

test("parseReminderCron supports daily schedules and next run stays in the future", () => {
    const config = parseReminderCron("0 8 * * *");
    const now = new Date("2026-04-24T00:30:00.000Z");
    const nextRunAt = getNextRunAt(config, now);

    assert.deepEqual(config, { minute: 0, hour: 8 });
    assert.ok(nextRunAt.getTime() > now.getTime());
});
