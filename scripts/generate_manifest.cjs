const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generiert ein manifest.json für ein Release-Build.
 * Usage: node scripts/generate_manifest.cjs <version> <target-dir-or-files...>
 * Beispiel: node scripts/generate_manifest.cjs v1.0.41 src-tauri/target/release/archiv-des-vergessens.exe
 */

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Verwendung: node scripts/generate_manifest.cjs <version> <file1> [file2 ...]');
  process.exit(1);
}

const version = args[0].replace(/^v/i, '');
const filesToInclude = args.slice(1);

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const manifestFiles = [];

for (const fileInput of filesToInclude) {
  if (!fs.existsSync(fileInput)) {
    console.warn(`Warnung: Datei/Verzeichnis ${fileInput} nicht gefunden, wird übersprungen.`);
    continue;
  }

  const stat = fs.statSync(fileInput);
  if (stat.isFile()) {
    const filename = path.basename(fileInput);
    const sha256 = getSha256(fileInput);
    manifestFiles.push({
      path: filename,
      size: stat.size,
      sha256: sha256,
      download_url: `https://github.com/Trobikus/archiv-des-vergessens/releases/download/v${version}/${filename}`
    });
  } else if (stat.isDirectory()) {
    // Falls ein ganzes Verzeichnis eingebunden werden soll
    function scanDir(dir, baseDir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        if (entry.isFile()) {
          const sha256 = getSha256(fullPath);
          const fStat = fs.statSync(fullPath);
          manifestFiles.push({
            path: relPath,
            size: fStat.size,
            sha256: sha256,
            download_url: `https://github.com/Trobikus/archiv-des-vergessens/releases/download/v${version}/${relPath.replace(/\//g, '_')}`
          });
        } else if (entry.isDirectory()) {
          scanDir(fullPath, baseDir);
        }
      }
    }
    scanDir(fileInput, fileInput);
  }
}

const manifest = {
  version: version,
  created_at: new Date().toISOString(),
  files: manifestFiles
};

const outputPath = 'manifest.json';
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Manifest erfolgreich generiert in ${outputPath} mit ${manifestFiles.length} Datei(en):`);
manifestFiles.forEach(f => {
  console.log(`   - ${f.path} (${(f.size / 1024 / 1024).toFixed(2)} MB, SHA256: ${f.sha256.substring(0, 8)}...)`);
});
