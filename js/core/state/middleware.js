/**
 * ============================================================
 * FILE: core/state/middleware.js – State Middleware (Hauptexport)
 * ============================================================
 * 
 * Exportiert alle Middleware-Funktionen für den StateManager.
 * ============================================================
 */

// Direkte Exporte aus den einzelnen Dateien
export { loggingMiddleware } from './middleware/logging.js';
export { persistenceMiddleware } from './middleware/persistence.js';
export { validationMiddleware, createDefaultValidationMiddleware } from './middleware/validation.js';
export { performanceMiddleware } from './middleware/performance.js';