#!/bin/bash
# scripts/generate-updater-keys.sh
# Skript zum sicheren Generieren eines neuen Tauri-Updater-Schlüsselpaars.
# WARNUNG: Der private Schlüssel darf NIEMALS ins Git-Repository committet werden!

set -e

KEY_DIR="$HOME/.tauri"
KEY_PATH="$KEY_DIR/updater.key"

echo "==> Erstelle Schlüsselverzeichnis ($KEY_DIR)..."
mkdir -p "$KEY_DIR"

if [ -f "$KEY_PATH" ]; then
    echo "⚠️  Achtung: $KEY_PATH existiert bereits!"
    read -p "Möchtest du einen neuen Schlüssel generieren und den alten überschreiben? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Abgebrochen."
        exit 0
    fi
fi

echo "==> Generiere neues Tauri Updater Keypair..."
npx @tauri-apps/cli signer generate -w "$KEY_PATH"

echo ""
echo "========================================================================="
echo "✅ Schlüsselpaar erfolgreich generiert!"
echo "-------------------------------------------------------------------------"
echo "1. Öffentlicher Schlüssel (Public Key):"
echo "   Kopiere den Inhalt der Datei $KEY_PATH.pub"
echo "   in 'src-tauri/tauri.conf.json' unter 'plugins.updater.pubkey'."
echo ""
echo "2. Privater Schlüssel (Private Key für GitHub Secrets):"
echo "   Der private Schlüssel liegt unter: $KEY_PATH"
echo "   Trage den gesamten Inhalt dieser Datei als GitHub Secret ein:"
echo "   - Name: TAURI_PRIVATE_KEY"
echo "   - Wert: (Inhalt von $KEY_PATH)"
echo "   Falls ein Passwort vergeben wurde, zusätzlich:"
echo "   - Name: TAURI_KEY_PASSWORD"
echo "========================================================================="
