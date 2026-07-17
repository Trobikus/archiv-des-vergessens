/**
 * ============================================================
 * FILE: ui/preact/shared/Modal.js – Wiederverwendbares Modal
 * ============================================================
 */

import { h, html, useEffect } from '../setup.js';

export function Modal({ isOpen, onClose, title, children, size = 'medium', className = '' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeMap = {
    small: '450px',
    medium: '600px',
    large: '850px',
    xlarge: '1050px'
  };

  return html`
    <div class="modal-overlay" style="display: flex;" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-content glass-panel ${className}" style="max-width: ${sizeMap[size] || '600px'}; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;" onClick=${(e) => e.stopPropagation()}>
        ${title ? html`
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid rgba(197,160,89,0.1); flex-shrink: 0;">
            <h2 style="font-family: var(--font-header); color: var(--color-gold); font-size: 1.4rem; margin: 0;">${title}</h2>
            <button class="modal-close" style="background: none; border: none; color: var(--color-text-muted); font-size: 2rem; cursor: pointer; line-height: 1;" onClick=${onClose}>×</button>
          </div>
        ` : html`
          <button class="modal-close" style="position: absolute; top: 1rem; right: 1.5rem; background: none; border: none; color: var(--color-text-muted); font-size: 2rem; cursor: pointer; line-height: 1; z-index: 10;" onClick=${onClose}>×</button>
        `}
        <div style="flex: 1; overflow-y: auto; padding-top: 1rem; padding-right: 0.5rem;">
          ${children}
        </div>
      </div>
    </div>
  `;
}