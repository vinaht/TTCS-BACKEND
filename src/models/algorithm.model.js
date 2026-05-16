const ALGORITHM_TABLE = "algorithms";

const REQUIRED_ALGORITHM_COLUMNS = [
    "id",
    "course",
    "stage",
    "category",
    "case_code",
    "name",
    "formula",
    "note",
    "description",
    "image_url",
    "video_url",
    "video_start_seconds",
    "video_end_seconds",
    "difficulty",
    "sort_order",
    "is_active",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at"
];

const buildAlgorithmSelectColumns = (alias = "") => {
    const prefix = alias ? `${alias}.` : "";

    return `
        ${prefix}id,
        ${prefix}course,
        ${prefix}stage,
        ${prefix}category,
        ${prefix}case_code,
        ${prefix}name,
        ${prefix}formula,
        ${prefix}note,
        ${prefix}description,
        ${prefix}image_url,
        ${prefix}video_url,
        ${prefix}video_start_seconds,
        ${prefix}video_end_seconds,
        ${prefix}difficulty,
        ${prefix}sort_order,
        ${prefix}is_active,
        ${prefix}created_by,
        ${prefix}updated_by,
        ${prefix}created_at,
        ${prefix}updated_at
    `;
};

const ALGORITHM_SELECT_COLUMNS = buildAlgorithmSelectColumns();

const mapAlgorithmRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        course: row.course,
        stage: row.stage,
        category: row.category,
        caseCode: row.case_code,
        name: row.name,
        formula: row.formula,
        note: row.note,
        description: row.description,
        imageUrl: row.image_url,
        videoUrl: row.video_url,
        videoStartSeconds: row.video_start_seconds,
        videoEndSeconds: row.video_end_seconds,
        difficulty: row.difficulty,
        sortOrder: row.sort_order,
        isActive: Boolean(row.is_active),
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const toPublicAlgorithm = (algorithm) => {
    if (!algorithm) {
        return null;
    }

    return {
        id: algorithm.id,
        course: algorithm.course,
        stage: algorithm.stage,
        category: algorithm.category,
        caseCode: algorithm.caseCode,
        name: algorithm.name,
        formula: algorithm.formula,
        note: algorithm.note,
        description: algorithm.description,
        imageUrl: algorithm.imageUrl,
        videoUrl: algorithm.videoUrl,
        videoStartSeconds: algorithm.videoStartSeconds,
        videoEndSeconds: algorithm.videoEndSeconds,
        difficulty: algorithm.difficulty,
        sortOrder: algorithm.sortOrder,
        isActive: Boolean(algorithm.isActive),
        createdBy: algorithm.createdBy,
        updatedBy: algorithm.updatedBy,
        createdAt: algorithm.createdAt,
        updatedAt: algorithm.updatedAt
    };
};

module.exports = {
    ALGORITHM_TABLE,
    ALGORITHM_SELECT_COLUMNS,
    REQUIRED_ALGORITHM_COLUMNS,
    buildAlgorithmSelectColumns,
    mapAlgorithmRow,
    toPublicAlgorithm
};
