const USER_FORMULA_TABLE = "user_formulas";

const REQUIRED_USER_FORMULA_COLUMNS = [
    "id",
    "user_id",
    "name",
    "category",
    "case_code",
    "formula",
    "notes",
    "created_at",
    "updated_at"
];

const USER_FORMULA_SELECT_COLUMNS = `
    id,
    user_id,
    name,
    category,
    case_code,
    formula,
    notes,
    created_at,
    updated_at
`;

const mapUserFormulaRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        caseCode: row.case_code,
        formula: row.formula,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const toPublicUserFormula = (userFormula) => {
    if (!userFormula) {
        return null;
    }

    return {
        id: userFormula.id,
        userId: userFormula.userId,
        name: userFormula.name,
        category: userFormula.category,
        caseCode: userFormula.caseCode,
        formula: userFormula.formula,
        notes: userFormula.notes,
        createdAt: userFormula.createdAt,
        updatedAt: userFormula.updatedAt
    };
};

module.exports = {
    REQUIRED_USER_FORMULA_COLUMNS,
    USER_FORMULA_SELECT_COLUMNS,
    USER_FORMULA_TABLE,
    mapUserFormulaRow,
    toPublicUserFormula
};
