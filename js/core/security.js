// ============================================================
// FILE: core/security.js – Checksum (mit Worker-Support)
// ============================================================

// ---- Checksum (wird nun hauptsächlich über Worker ausgeführt) ----
export class Checksum {
    /**
     * Berechnet eine Prüfsumme (synchroner Fallback).
     * Für Produktion wird der Worker bevorzugt.
     */
    static calculate(data) {
        // Diese Methode wird nur als Fallback verwendet
        const json = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}