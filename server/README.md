# Archiv des Vergessens - Multiplayer-Server

Dies ist das leichtgewichtige Node.js-Backend für den Multiplayer-Modus von **Archiv des Vergessens**. Der Server basiert auf nativen WebSockets (`ws`) und ist speziell darauf optimiert, mit extrem wenig Arbeitsspeicher auszukommen (perfekt für das kostenlose 1 GB RAM `e2-micro`-VM-Kontingent der Google Cloud).

## Features
* **Echtzeit-Chat:** Verteilt Nachrichten an alle Spieler (global) sowie an Gilden-Räume.
* **Globale Bestenliste:** Verwaltet Highscores und speichert sie persistent in `data/leaderboard.json`.
* **Sichere Cloud-Saves:** Speichert verschlüsselte/JSON-basierte Spielstände der Spieler unter `data/saves/`.

---

## Lokale Entwicklung (Schnellstart)

1. Navigiere in das Server-Verzeichnis:
   ```bash
   cd server
   ```
2. Installiere die Abhängigkeit (`ws`):
   ```bash
   npm install
   ```
3. Starte den Server im Entwicklungsmodus (startet bei Dateiänderungen automatisch neu):
   ```bash
   npm run dev
   ```
   Der Server läuft nun standardmäßig auf `ws://localhost:8080`.

---

## Deployment auf der Google Cloud VM

Wenn du den Code in dein GitHub-Repository gepusht hast, kannst du ihn ganz leicht auf deiner VM in Betrieb nehmen:

### 1. Auf der VM einloggen & Code holen
Verbinde dich per SSH mit deiner VM. Da auf einer frischen VM standardmäßig kein Git installiert sein kann, installiere es zuerst:

```bash
# Git installieren
sudo apt update && sudo apt install git -y

# In dein Projektverzeichnis wechseln und Code klonen/holen
cd /pfad/zu/deinem/verzeichnis
git pull
cd server
npm install
```

### 2. Server im Hintergrund starten (mit PM2)
Damit der Server online bleibt, wenn du dein SSH-Fenster schließt, nutzen wir den Prozessmanager **PM2**:

1. **PM2 installieren (falls noch nicht geschehen):**
   ```bash
   sudo npm install -g pm2
   ```
2. **Server starten:**
   ```bash
   pm2 start server.js --name "archiv-server"
   ```
3. **Status prüfen:**
   ```bash
   pm2 list
   ```
4. **Logs in Echtzeit einsehen:**
   ```bash
   pm2 logs archiv-server
   ```
5. **Autostart bei VM-Reboot aktivieren:**
   ```bash
   pm2 startup
   # Kopiere den Befehl, den PM2 dir anzeigt, füge ihn ein und führe ihn aus.
   pm2 save
   ```

### 3. Reverse Proxy & SSL (WSS) Einrichtung
Um die IP-Adresse der VM zu verbergen und sichere WSS-Verbindungen (Port 443) zu ermöglichen, nutze Nginx oder Caddy (Konfigurationsdateien befinden sich unter `deploy/`):

```bash
# Nginx & Certbot installieren
sudo apt install nginx certbot python3-certbot-nginx -y

# Reverse Proxy Config kopieren und aktivieren
sudo cp deploy/nginx/nginx.conf /etc/nginx/sites-available/archiv-des-vergessens.conf
sudo ln -s /etc/nginx/sites-available/archiv-des-vergessens.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL-Zertifikat via Let's Encrypt abrufen
sudo certbot --nginx -d grimoireinteractive.duckdns.org
```

Der Server ist nun sicher verschlüsselt unter `wss://grimoireinteractive.duckdns.org` erreichbar!
