const crypto = require('crypto');
const fs = require('fs');

const fileToSign = process.argv[2];

if (!fileToSign || !fs.existsSync(fileToSign)) {
    console.error('Bitte eine gültige Datei übergeben: node sign_release.js <pfad-zur-datei>');
    process.exit(1);
}

if (!fs.existsSync('private.key')) {
    console.error('private.key nicht gefunden! Bitte generiere zuerst ein Schlüsselpaar mit generate_keys.js');
    process.exit(1);
}

const privateKeyHex = fs.readFileSync('private.key', 'utf-8').trim();

// Umwandeln des 32-Byte Raw Hex Keys in das von Node.js erwartete DER/PKCS8 Format für Ed25519
const privDer = Buffer.concat([
    Buffer.from('302e020100300506032b657004220420', 'hex'), 
    Buffer.from(privateKeyHex, 'hex')
]);

const privateKey = crypto.createPrivateKey({
    key: privDer,
    format: 'der',
    type: 'pkcs8'
});

const fileData = fs.readFileSync(fileToSign);
const signature = crypto.sign(null, fileData, privateKey);

const sigHex = signature.toString('hex');
const sigPath = fileToSign + '.sig';

fs.writeFileSync(sigPath, sigHex);
console.log(`Datei erfolgreich signiert!`);
console.log(`Signatur gespeichert in: ${sigPath}`);
console.log(`Signatur (Hex): ${sigHex}`);
