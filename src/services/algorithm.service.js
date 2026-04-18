const algorithmRepository = require("../repositories/algorithm.repository");
const createPendingAction = require("../utils/createPendingAction");

class AlgorithmService {
    getStatus() {
        return {
            ...algorithmRepository.getMeta(),
            plannedEndpoints: ["GET /", "GET /:id", "POST /", "PUT /:id", "DELETE /:id"]
        };
    }

    getAll() {
        return createPendingAction("Algorithms list");
    }

    getById() {
        return createPendingAction("Algorithm detail");
    }

    create() {
        return createPendingAction("Algorithm create");
    }

    update() {
        return createPendingAction("Algorithm update");
    }

    remove() {
        return createPendingAction("Algorithm delete");
    }
}

module.exports = new AlgorithmService();
