#!/usr/bin/env node

/**
 * Pre-Tool Execution Hook
 * Blockiert destruktive Aktionen oder erzwingt eine Bestätigung.
 * Gibt bei Ablehnung Exit-Code 0 zurück, damit es als reguläre Ablehnung
 * (und nicht als Absturz/Fehler) behandelt wird.
 */

import fs from 'fs';

// Lese den Input aus stdin
let inputData = '';
process.stdin.setEncoding('utf-8');

process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = inputData.trim() ? JSON.parse(inputData) : parseArgs(process.argv);
    evaluateToolCall(payload);
  } catch (err) {
    // Bei Parsing-Fehlern den Hook passieren lassen, um den Agenten nicht komplett zu blockieren
    console.log(`[AGENT HOOK WARNING] Konnte Tool-Payload nicht parsen: ${err.message}`);
    process.exit(0); 
  }
});

function parseArgs(args) {
    // Fallback auf Argumente (--tool name --args '{"cmd": "..."}')
    const toolIndex = args.indexOf('--tool');
    const argsIndex = args.indexOf('--args');
    if (toolIndex > -1 && argsIndex > -1) {
        return {
            name: args[toolIndex + 1],
            arguments: JSON.parse(args[argsIndex + 1])
        };
    }
    return { name: 'unknown', arguments: {} };
}

function evaluateToolCall(toolCall) {
  const { name, arguments: args } = toolCall;
  let rejected = false;
  let reason = '';

  // 1. Destruktive Shell-Kommandos und DB-Migrationen prüfen
  if (name === 'run_command' || name === 'execute_command' || name === 'bash') {
    const cmd = (args.command || args.CommandLine || args.cmd || '').toLowerCase();
    
    // Gefährliche Shell-Befehle
    if (cmd.includes('rm -rf') || cmd.includes('rmdir /s') || cmd.includes('del /q') || cmd.includes('del /f /s /q')) {
      rejected = true;
      reason = 'Destruktiver Shell-Befehl (rm/del) erkannt. Bitte vorher ein Backup sicherstellen und die explizite Bestätigung des Entwicklers einholen.';
    }

    // DB-Migrationen / Drops
    if (cmd.includes('drop table') || cmd.includes('delete from ') || cmd.includes('migration')) {
      rejected = true;
      reason = 'Destruktive Datenbank-Aktion (DROP/DELETE/Migration) erkannt. Vor Ausführung lokales Backup anfertigen oder Dry-Run durchführen, sowie Erlaubnis einholen.';
    }
  }

  // 2. Auth/Session und Save-Dateien beim Schreiben prüfen
  if (name === 'write_to_file' || name === 'replace_file_content' || name === 'multi_replace_file_content' || name === 'edit_file') {
      const filePath = (args.TargetFile || args.file || args.AbsolutePath || '').toLowerCase();
      
      // Änderungen an Auth/Session
      if (filePath.includes('auth') || filePath.includes('session') || filePath.includes('login') || filePath.includes('password') || filePath.includes('jwt')) {
          rejected = true;
          reason = 'Änderungen an Auth-/Session-Code erfordern vorab eine explizite Bestätigung vom Solo-Entwickler.';
      }
      
      // Löschen/Überschreiben von Save-Dateien oder Datenbanken
      if (filePath.endsWith('.db') || filePath.endsWith('.sqlite') || filePath.endsWith('.save') || filePath.includes('savegame')) {
          const overwrite = args.Overwrite === true || args.Overwrite === 'true';
          if (overwrite) {
              rejected = true;
              reason = 'Direktes Überschreiben/Löschen von Save- oder DB-Dateien ist blockiert. Bitte SQLite-Tools nutzen und Backup erstellen.';
          }
      }
  }

  if (rejected) {
    // Bei Ablehnung wird der Grund ausgegeben und Exit-Code 0 geliefert,
    // damit der Agent es als sanfte Ablehnung registriert.
    console.log(`[HOOK REJECTED] ${reason}`);
    process.exit(0);
  }

  // Akzeptiert
  process.exit(0);
}

// Sicherheits-Timeout, falls stdin nicht rechtzeitig triggert
setTimeout(() => {
    process.exit(0);
}, 2000);
