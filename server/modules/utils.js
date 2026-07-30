/**
 * ============================================================
 * FILE: server/modules/utils.js - Hilfsfunktionen
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Sanitize-Funktion für Input-Sicherheit
 * - Send/Broadcast-Helfer
 * - Allgemeine Utility-Funktionen
 * ============================================================
 */

/**
 * Sanitizes a string to prevent XSS and limit length
 * @param {any} str - The input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitize(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .substring(0, maxLength);
}

/**
 * Sends a message to a specific WebSocket client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} type - Message type
 * @param {any} payload - Message payload
 */
export function send(ws, type, payload) {
  if (ws && ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify({ type, payload }));
  }
}

/**
 * Broadcasts a message to all connected clients
 * @param {Map} clients - Map of WebSocket connections
 * @param {string} type - Message type
 * @param {any} payload - Message payload
 */
export function broadcast(clients, type, payload) {
  const msg = JSON.stringify({ type, payload });
  for (const [ws] of clients) {
    if (ws && ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

/**
 * Generates a unique ID for messages/records
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
}

/**
 * Gets the client IP from a request, considering proxy headers
 * @param {Object} req - HTTP request object
 * @param {WebSocket} ws - WebSocket connection
 * @param {boolean} trustProxy - Whether to trust proxy headers
 * @returns {string} Client IP address
 */
export function getClientIP(req, ws, trustProxy = false) {
  if (!trustProxy) {
    return ws?._socket?.remoteAddress || 'unknown';
  }
  
  const forwarded = req?.headers['x-forwarded-for'];
  return forwarded 
    ? forwarded.split(',')[0].trim() 
    : req?.headers['x-real-ip'] || ws?._socket?.remoteAddress || 'unknown';
}
