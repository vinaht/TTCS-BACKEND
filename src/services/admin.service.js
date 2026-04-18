const adminRepository = require("../repositories/admin.repository");
const createPendingAction = require("../utils/createPendingAction");

class AdminService {
    getStatus() {
        return {
            ...adminRepository.getMeta(),
            plannedEndpoints: ["GET /status"]
        };
    }

    getOverview() {
        return createPendingAction("Admin overview");
    }
}

module.exports = new AdminService();
