/**
 * ============================================================
 * FILE: ui/preact/shared/ToastManager.js – Toast-Benachrichtigungen
 * ============================================================
 */

import { h, html, useState, useEffect, useEventBus } from '../setup.js';

export function ToastManager({ eventBus }) {
  const [toasts, setToasts] = useState([]);

  useEventBus(eventBus, 'ui:showToast', (data) => {
    const id = Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, ...data, timestamp: Date.now() }]);
    // Automatisch entfernen
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, data.duration || 4000);
  });

  if (toasts.length === 0) return null;

  const iconMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const colorMap = {
    info: 'rgba(255,255,255,0.08)',
    success: 'rgba(74, 222, 128, 0.4)',
    warning: 'rgba(251, 191, 36, 0.4)',
    error: 'rgba(248, 113, 113, 0.4)'
  };

  return html`
    <div style="position: fixed; top: 20px; right: 20px; z-index: 100001; display: flex; flex-direction: column; gap: 10px; max-width: 360px; width: 100%; pointer-events: none;">
      ${toasts.map(toast => html`
        <div style="background: rgba(10,10,18,0.92); backdrop-filter: blur(8px); border: 1px solid ${colorMap[toast.type] || 'rgba(255,255,255,0.08)'}; border-radius: 8px; padding: 0.8rem 1.2rem; color: #d0d0e0; font-family: var(--font-body, sans-serif); font-size: 0.9rem; pointer-events: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: slideInToast 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); display: flex; align-items: center; gap: 0.8rem; min-height: 48px;">
          <span style="font-size: 1.2rem;">${iconMap[toast.type] || 'ℹ️'}</span>
          <span style="flex: 1;">${toast.message}</span>
          ${toast.action && toast.onAction ? html`
            <button class="glass-btn btn-small" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onClick=${() => { toast.onAction(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}>
              ${toast.action}
            </button>
          ` : ''}
          <button style="background: none; border: none; color: #666; font-size: 1.4rem; cursor: pointer; padding: 0 0.2rem; line-height: 1;" onClick=${() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button>
        </div>
      `)}
      <style>
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutToast {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }
      </style>
    </div>
  `;
}