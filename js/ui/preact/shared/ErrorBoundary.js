/**
 * ============================================================
 * FILE: ui/preact/shared/ErrorBoundary.js – Fehler-Grenze
 * ============================================================
 */

import { Component, html } from '../setup.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] UI-Fehler:', error, errorInfo);
    if (this.props.eventBus) {
      this.props.eventBus.publish('ui:showToast', {
        message: `⚠️ Fehler in der UI: ${error.message}`,
        type: 'error',
        duration: 6000
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return html`
        <div style="padding: 2rem; margin: 1rem; border: 1px solid var(--color-danger); border-radius: 4px; text-align: center; background: rgba(139,28,28,0.05);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <h3 style="color: var(--color-danger); font-family: var(--font-header); margin-bottom: 0.5rem;">Etwas ist schiefgelaufen</h3>
          <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${this.state.error?.message || 'Unbekannter Fehler'}</p>
          <button class="glass-btn primary" onClick=${this.handleReset}>🔄 Neu laden</button>
        </div>
      `;
    }
    return this.props.children;
  }
}