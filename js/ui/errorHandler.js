// ui/errorHandler.js
export function safeRender(renderFn, fallback) {
    try {
        const result = renderFn();
        return result;
    } catch (error) {
        console.error('[UI] Render-Fehler:', error);
        return fallback || '<div class="text-danger">⚠️ Fehler beim Rendern</div>';
    }
}

// Globaler Fehlerhandler für UI-Events
export function safeAddEventListener(element, event, handler) {
    if (!element) {
        console.warn('[UI] Element nicht gefunden für Event', event);
        return;
    }
    element.addEventListener(event, (e) => {
        try {
            handler(e);
        } catch (error) {
            console.error('[UI] Event-Handler Fehler:', error);
            // Optional: Benutzer benachrichtigen
        }
    });
}