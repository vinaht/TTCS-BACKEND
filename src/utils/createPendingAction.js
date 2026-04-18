const ApiError = require("./ApiError");

const createPendingAction = (featureName) => {
    throw new ApiError(
        501,
        `${featureName} has been scaffolded in MVC and will be implemented in the next step.`
    );
};

module.exports = createPendingAction;
