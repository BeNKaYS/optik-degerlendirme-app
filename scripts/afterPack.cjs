const path = require('path');
const rcedit = require('rcedit');

exports.default = async function (context) {
    // context.appOutDir: path to win-unpacked directory
    // context.packager.appInfo.productFilename: "Optik Deðerlendirme"

    const exeName = context.packager.appInfo.productFilename + ".exe";
    const exePath = path.join(context.appOutDir, exeName);

    // Proje ana dizinini bul
    const projectDir = context.packager.projectDir;
    const iconPath = path.join(projectDir, "public", "icon.ico");

    console.log(`[Custom Hook] Ýkon deðiþtiriliyor: ${exePath}`);
    console.log(`[Custom Hook] Ýkon dosyasý: ${iconPath}`);

    try {
        await rcedit(exePath, {
            icon: iconPath
        });
        console.log("[Custom Hook] Ýkon baþarýyla deðiþtirildi! ?");
    } catch (error) {
        console.error("[Custom Hook] Ýkon deðiþtirme hatasý ?:", error);
    }
};
