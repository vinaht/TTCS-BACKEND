const addAssignment = (assignments, params, columnName, value, formatValue = (item) => item) => {
    if (value === undefined) {
        return;
    }

    assignments.push(`${columnName} = ?`);
    params.push(formatValue(value));
};

module.exports = {
    addAssignment
};
