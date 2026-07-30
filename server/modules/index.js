/**
 * ============================================================
 * FILE: server/modules/index.js - Module Exports
 * ============================================================
 * 
 * Zentrale Export-Datei für alle Server-Module
 */

export { generateSalt, hashPassword, verifyPassword, generateToken } from './crypto.js';
export { initDatabase, initPreparedStatements, verifyDatabaseIntegrity, getDatabase, getStatements, closeDatabase } from './database.js';
export { createDatabaseBackup, cleanupOldBackups, attemptRecoveryFromBackup, startBackupScheduler, startVacuumScheduler, stopSchedulers } from './backup.js';
export { migrateOldJsonData } from './migration.js';
export { validateEmailFormat, checkUsernameSimilarity, checkRateLimit, createUser, loginUser, verifyToken, convertGuestToUser } from './auth.js';
export { sanitize, send, broadcast, generateId, getClientIP } from './utils.js';
export { saveGlobalMessage, saveGuildMessage, pruneChatHistory, getGlobalChatHistory, getGuildChatHistory, sendChatHistory, broadcastChatMessage } from './chat.js';
export { getTop10, submitHighscore, broadcastLeaderboardUpdate, isRegisteredUser } from './leaderboard.js';
export { saveGame, loadGame, hasSaveGame } from './cloudsave.js';
