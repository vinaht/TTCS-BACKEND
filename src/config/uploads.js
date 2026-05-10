const path = require("path");

const uploadRoot = path.resolve(__dirname, "../../uploads");
const algorithmImageDir = path.join(uploadRoot, "algorithms", "images");
const uploadPublicPath = "/uploads";
const algorithmImagePublicPath = `${uploadPublicPath}/algorithms/images`;

module.exports = {
    algorithmImageDir,
    algorithmImagePublicPath,
    uploadPublicPath,
    uploadRoot
};
