const crypto = require('crypto');
const fs = require('fs');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

// Extrahieren der reinen 32-Byte Rohdaten (Hex-Format)
const pubHex = publicKey.export({ format: 'der', type: 'spki' }).slice(-32).toString('hex');
const privHex = privateKey.export({ format: 'der', type: 'pkcs8' }).slice(-32).toString('hex');

fs.writeFileSync('public.key', pubHex);
fs.writeFileSync('private.key', privHex);

console.log('Schlüsselpaar erfolgreich generiert!');
console.log('Public Key (in den Launcher einfügen!):', pubHex);
console.log('Private Key (für sign_release.js, GEHEIM HALTEN!):', privHex);
