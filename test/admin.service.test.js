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
            })
        },
        algorithmRepo: {
            ensureSchema: async () => true,
            countAlgorithms: async () => 42
        },
        reminders: {
            isMailConfigured: () => true
        }
    });

    const result = await service.getOverview();

    assert.deepEqual(result, {
        totalUsers: 12,
        totalAlgorithms: 42,
        activeUsers60d: 7,
        inactiveUsers60d: 5
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
            isMailConfigured: () => true
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

test("AdminService delegates manual reminders to reminder service", async () => {
    const reminderCalls = [];
    const service = new AdminService({
        repository: {},
        algorithmRepo: {},
        reminders: {
            isMailConfigured: () => true,
            sendManualReminder: async (payload) => {
                reminderCalls.push(payload);
                return {
                    userId: payload.userId,
                    status: "sent"
                };
            }
        }
    });

    const result = await service.sendManualReminder(7, 3);

    assert.deepEqual(reminderCalls, [
        {
            userId: 7,
            actorUserId: 3
        }
    ]);
    assert.deepEqual(result, {
        userId: 7,
        status: "sent"
    });
});
