const test = require("node:test");
const assert = require("node:assert/strict");

const { AdminService } = require("../src/services/admin.service");

test("AdminService overview aggregates user and algorithm totals", async () => {
    const service = new AdminService({
        repository: {
            ensureSchema: async () => true,
            getUserOverviewCounts: async () => ({
                total_users: 12,
                active_users: 7,
                inactive_users: 5
            }),
            getLastAutoReminderRun: async () => "2026-04-24T01:00:00.000Z"
        },
        algorithmRepo: {
            ensureSchema: async () => true,
            countAlgorithms: async () => 42
        },
        reminders: {
            isMailConfigured: () => true,
            isSchedulerRunning: () => false
        }
    });

    const result = await service.getOverview();

    assert.deepEqual(result, {
        totalUsers: 12,
        totalAlgorithms: 42,
        activeUsers60d: 7,
        inactiveUsers60d: 5,
        lastAutoReminderRun: "2026-04-24T01:00:00.000Z"
    });
});

test("AdminService validates allowed roles when updating user", async () => {
    const service = new AdminService({
        repository: {
            updateUser: async () => {
                throw new Error("updateUser should not be called");
            }
        },
        algorithmRepo: {},
        reminders: {
            isMailConfigured: () => true,
            isSchedulerRunning: () => false
        }
    });

    await assert.rejects(
        () => service.updateUser(1, { role: "superadmin" }),
        (error) => {
            assert.equal(error.statusCode, 400);
            assert.match(error.message, /Role must be either user or admin/);
            return true;
        }
    );
});
