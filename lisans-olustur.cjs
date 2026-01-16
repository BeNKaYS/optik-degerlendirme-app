const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Sabit şifreleme anahtarı (Bunu asla değiştirmeyin)
const SECRET_KEY = crypto
    .createHash('sha256')
    .update('OPTIK_FORM_APP_2025_SERCAN_KEY')
    .digest('base64')
    .substr(0, 32);

const ALGORITHM = 'aes-256-cbc';

function generateLicense(days, ownerName) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const data = JSON.stringify({
        expiry: expiryDate.getTime(),
        created: Date.now(),
        valid: true,
        owner: ownerName // Lisansın kime ait olduğu verisi
    });

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: IV:EncryptedData (Base64 encoded)
    const licenseKey = Buffer.from(`${iv.toString('hex')}:${encrypted}`).toString('base64');

    return {
        key: licenseKey,
        expiryDate: expiryDate.toLocaleDateString('tr-TR')
    };
}

const args = process.argv.slice(2);
const days = args[0] || 30;
const owner = args[1] || "GenelKullanici";

try {
    const license = generateLicense(days, owner);

    // Dosya ismini güvenli hale getir (Türkçe karakterleri ve boşlukları düzelt)
    const safeName = owner
        .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ ]/g, "")
        .trim();

    const fileName = `${safeName}_${days}Gunluk_Lisans.txt`;
    const filePath = path.join(__dirname, fileName);

    const fileContent = `=========================================\n` +
        `          OPTIK FORM LISANS BELGESI       \n` +
        `=========================================\n` +
        `LISANS SAHIBI : ${owner}\n` +
        `SURE          : ${days} Gun\n` +
        `SON KULLANMA  : ${license.expiryDate}\n` +
        `OLUSTURULMA   : ${new Date().toLocaleDateString('tr-TR')}\n` +
        `-----------------------------------------\n` +
        `LISANS ANAHTARI:\n` +
        `${license.key}\n` +
        `=========================================\n` +
        `\n` +
        `ILETISIM VE TEKNIK DESTEK:\n` +
        `-----------------------------------------\n` +
        `Gelistirici : Sercan OZDEMIR (BeNKaYS)\n` +
        `E-posta     : sercanozdemir@yandex.com\n` +
        `GitHub      : github.com/BeNKaYS\n` +
        `=========================================`;

    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`\n=========================================`);
    console.log(`       YENI LISANS OLUSTURULDU`);
    console.log(`=========================================`);
    console.log(`SAHIP       : ${owner}`);
    console.log(`SURE        : ${days} Gun`);
    console.log(`SON KULLANMA: ${license.expiryDate}`);
    console.log(`DOSYA       : ${fileName}`);
    console.log(`\nANAHTAR (Dosyaya da kaydedildi):`);
    console.log(`-----------------------------------------`);
    console.log(license.key);
    console.log(`-----------------------------------------`);
} catch (error) {
    console.error("Hata olustu:", error);
}
