const fs = require("fs");
const path = require("path");

const { initializeDatabase, getDatabasePool } = require("../src/config/database");
const { algorithmImageDir, algorithmImagePublicPath } = require("../src/config/uploads");
const algorithmService = require("../src/services/algorithm.service");
const { ensureLocalAdmin } = require("./seed-local-admin");

const backendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(backendRoot, "..");
const frontendImageRoot = path.join(workspaceRoot, "Frontend", "assets", "image");

const ZERO_WIDTH_PATTERN = /[\u200B\u200C\u200D\uFEFF]/g;
const CURLY_SINGLE_QUOTE_PATTERN = /[\u2018\u2019]/g;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const PAGE_LIMIT = 100;

const CATALOG_SECTIONS = [
    {
        course: "cfop",
        stage: "f2l",
        category: "F2L",
        directory: "F2L",
        prefix: "F2L"
    },
    {
        course: "cfop",
        stage: "oll",
        category: "OLL",
        directory: "OLL",
        prefix: "OLL"
    },
    {
        course: "cfop",
        stage: "pll",
        category: "PLL",
        directory: "PLL",
        prefix: "PLL"
    }
];

const DEPRECATED_DEMO_ALGORITHMS = [
    { course: "beginner", stage: "cross", category: "Beginner", caseCode: "B-CROSS-01" },
    { course: "beginner", stage: "layer1", category: "Beginner", caseCode: "B-L1-01" },
    { course: "beginner", stage: "layer2", category: "Beginner", caseCode: "B-L2-01" },
    { course: "beginner", stage: "yellow-cross", category: "Beginner", caseCode: "B-YC-01" },
    { course: "beginner", stage: "yellow-face", category: "Beginner", caseCode: "B-YF-01" },
    { course: "beginner", stage: "finish", category: "Beginner", caseCode: "B-FIN-01" },
    { course: "cfop", stage: "cross", category: "Cross", caseCode: "C-CROSS-01" }
];

const padCaseNumber = (numberValue) => String(numberValue).padStart(2, "0");

const normalizeFormula = (value) =>
    String(value || "")
        .replace(ZERO_WIDTH_PATTERN, "")
        .replace(CURLY_SINGLE_QUOTE_PATTERN, "'")
        .replace(/\s+/g, " ")
        .trim();

const normalizeImageExtension = (fileName) => {
    const extension = path.extname(fileName).toLowerCase();

    if (extension === ".jpeg") {
        return ".jpg";
    }

    return extension;
};

const listCatalogImages = (sourceDir) => {
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Missing CFOP asset directory: ${sourceDir}`);
    }

    return fs
        .readdirSync(sourceDir, { withFileTypes: true })
        .filter((entry) => {
            if (!entry.isFile()) {
                return false;
            }

            return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
        })
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
};

const buildCfopCatalog = ({ imageRoot = frontendImageRoot } = {}) =>
    CATALOG_SECTIONS.flatMap((section) => {
        const sourceDir = path.join(imageRoot, section.directory);
        const imageNames = listCatalogImages(sourceDir);

        return imageNames.map((imageName, index) => {
            const caseNumber = padCaseNumber(index + 1);
            const extension = normalizeImageExtension(imageName);
            const imageFileName = `cfop-${section.stage}-${caseNumber}${extension}`;

            return {
                course: section.course,
                stage: section.stage,
                category: section.category,
                caseCode: `${section.prefix}-${caseNumber}`,
                name: `${section.prefix} ${caseNumber}`,
                formula: normalizeFormula(path.basename(imageName, path.extname(imageName))),
                description: "",
                imageSource: [section.directory, imageName],
                imageFileName,
                videoUrl: "",
                videoStartSeconds: "",
                videoEndSeconds: "",
                difficulty: "",
                sortOrder: index + 1,
                isActive: true
            };
        });
    });

const copyCatalogImage = (seed) => {
    const sourcePath = path.join(frontendImageRoot, ...seed.imageSource);
    const targetPath = path.join(algorithmImageDir, seed.imageFileName);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing CFOP catalog image: ${sourcePath}`);
    }

    fs.mkdirSync(algorithmImageDir, { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);

    return `${algorithmImagePublicPath}/${seed.imageFileName}`;
};

const findExistingAlgorithm = async (seed) => {
    let page = 1;
    let totalPages = 1;

    do {
        const response = await algorithmService.getAll(
            {
                course: seed.course,
                stage: seed.stage,
                category: seed.category,
                page,
                limit: PAGE_LIMIT
            },
            { isAdmin: true }
        );
        const existing = response.items.find((item) => item.caseCode === seed.caseCode);

        if (existing) {
            return existing;
        }

        totalPages = response.pagination?.totalPages ??
            (response.items.length < PAGE_LIMIT ? page : page + 1);
        page += 1;
    } while (page <= totalPages);

    return null;
};

const upsertCatalogAlgorithm = async (seed, adminId) => {
    const payload = {
        course: seed.course,
        stage: seed.stage,
        category: seed.category,
        caseCode: seed.caseCode,
        name: seed.name,
        formula: seed.formula,
        description: seed.description,
        imageUrl: copyCatalogImage(seed),
        videoUrl: seed.videoUrl,
        videoStartSeconds: seed.videoStartSeconds,
        videoEndSeconds: seed.videoEndSeconds,
        difficulty: seed.difficulty,
        sortOrder: seed.sortOrder,
        isActive: seed.isActive
    };
    const existing = await findExistingAlgorithm(seed);

    if (existing) {
        await algorithmService.update(existing.id, payload, adminId);
        return "updated";
    }

    await algorithmService.create(payload, adminId);
    return "created";
};

const deactivateDeprecatedDemoAlgorithms = async (adminId) => {
    let deactivated = 0;

    for (const seed of DEPRECATED_DEMO_ALGORITHMS) {
        const existing = await findExistingAlgorithm(seed);

        if (!existing || !existing.isActive) {
            continue;
        }

        await algorithmService.update(existing.id, { isActive: false }, adminId);
        deactivated += 1;
    }

    return deactivated;
};

const seedLocalAlgorithms = async (adminUser) => {
    const databaseState = await initializeDatabase();

    if (!databaseState.connected) {
        throw new Error("Database is not connected. Set DB_ENABLED=true and check DB_* values.");
    }

    const admin = adminUser || await ensureLocalAdmin();
    await algorithmService.initialize();

    const catalog = buildCfopCatalog();
    const result = {
        created: 0,
        updated: 0,
        deactivated: 0,
        totalCatalogItems: catalog.length
    };

    for (const seed of catalog) {
        const action = await upsertCatalogAlgorithm(seed, admin.id);
        result[action] += 1;
    }

    result.deactivated = await deactivateDeprecatedDemoAlgorithms(admin.id);

    console.log(
        `[CubeAL seed] CFOP catalog ready: ${result.created} created, ` +
            `${result.updated} updated, ${result.deactivated} demo records deactivated, ` +
            `${result.totalCatalogItems} catalog items`
    );
    return result;
};

const run = async () => {
    try {
        await seedLocalAlgorithms();
    } finally {
        const pool = getDatabasePool();

        if (pool) {
            await pool.end();
        }
    }
};

if (require.main === module) {
    run().catch((error) => {
        console.error(`[CubeAL seed] algorithm seed failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    buildCfopCatalog,
    normalizeFormula,
    seedLocalAlgorithms
};
