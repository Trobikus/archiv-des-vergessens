/**
 * ============================================================
 * FILE: ui/preact/shared/ModalShell.js – gemeinsames Modal-Overlay
 * ============================================================
 */

import { h, html } from '../setup.js';

/**
 * Overlay + Panel + optionaler Titel/Close-Button.
 * Click auf Overlay schließt; Inhalt stoppt Propagation.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {import('preact').ComponentChildren} [props.children]
 * @param {string|import('preact').VNode} [props.title]
 * @param {string} [props.titleClass]
 * @param {string} [props.contentStyle]
 * @param {boolean} [props.showClose=true]
 * @param {string} [props.overlayClass]
 * @param {string} [props.overlayStyle]
 */
export function ModalShell({
  isOpen,
  onClose,
  children,
  title = null,
  titleClass = 'modal-title glow-text cinzel text-center',
  contentStyle = '',
  showClose = true,
  overlayClass = 'modal-overlay',
  overlayStyle = 'display: flex;'
}) {
  if (!isOpen) return null;

  return html`
    <div
      class=${overlayClass}
      style=${overlayStyle}
      onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        class="modal-content glass-panel"
        style=${contentStyle}
        onClick=${(e) => e.stopPropagation()}
      >
        ${showClose ? html`<button class="modal-close" type="button" onClick=${onClose}>×</button>` : null}
        ${title != null && title !== false ? html`<h2 class=${titleClass}>${title}</h2>` : null}
        ${children}
      </div>
    </div>
  `;
}

export default ModalShell;
