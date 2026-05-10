const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const escapeHtml = (value) =>
    String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const buildReminderMessage = (user, clientUrl) => {
    const baseUrl = trimTrailingSlash(clientUrl);
    const loginUrl = baseUrl ? `${baseUrl}/login.html` : "";
    const safeUsername = escapeHtml(user.username);
    const safeLoginUrl = escapeHtml(loginUrl);
    const subject = "CubeAL nhac ban quay lai luyen tap";
    const text = [
        `Xin chao ${user.username},`,
        "",
        `Ban da khong truy cap CubeAL trong ${user.inactiveDays} ngay.`,
        loginUrl ? `Quay lai tai: ${loginUrl}` : "Hay quay lai CubeAL de tiep tuc luyen tap.",
        "",
        "CubeAL Team"
    ].join("\n");
    const html = `
        <p>Xin chao <strong>${safeUsername}</strong>,</p>
        <p>Ban da khong truy cap CubeAL trong <strong>${user.inactiveDays}</strong> ngay.</p>
        <p>${
            loginUrl
                ? `<a href="${safeLoginUrl}">Quay lai CubeAL de tiep tuc luyen tap</a>`
                : "Hay quay lai CubeAL de tiep tuc luyen tap."
        }</p>
        <p>CubeAL Team</p>
    `;

    return {
        subject,
        text,
        html
    };
};

module.exports = {
    buildReminderMessage
};
