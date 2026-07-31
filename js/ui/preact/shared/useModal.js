/**
 * ============================================================
 * FILE: ui/preact/shared/useModal.js – gemeinsamer Modal-State-Hook
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef, useEventBus } from '../setup.js';

/**
 * Verwaltet Open/Close, Open-Event, closeAllModals und Escape.
 *
 * @param {import('../../../core/events/bus.js').default} eventBus
 * @param {Object} [options]
 * @param {string} [options.openEvent] Event zum Öffnen
 * @param {string} [options.closeEvent='ui:closeAllModals'] Event zum Schließen
 * @param {(data: *) => boolean} [options.canOpen] Wenn false, wird nicht geöffnet
 * @param {(data: *) => void} [options.onOpen] Callback nach dem Öffnen
 * @param {boolean} [options.closeOnEscape=true]
 * @returns {{ isOpen: boolean, open: Function, close: Function, setIsOpen: Function }}
 */
export function useModal(eventBus, options = {}) {
  const {
    openEvent,
    closeEvent = 'ui:closeAllModals',
    canOpen,
    onOpen,
    closeOnEscape = true
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const canOpenRef = useRef(canOpen);
  const onOpenRef = useRef(onOpen);
  canOpenRef.current = canOpen;
  onOpenRef.current = onOpen;

  const open = useCallback((data) => {
    if (canOpenRef.current && canOpenRef.current(data) === false) return;
    setIsOpen(true);
    if (onOpenRef.current) onOpenRef.current(data);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEventBus(eventBus, openEvent, open);
  useEventBus(eventBus, closeEvent, close);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close, closeOnEscape]);

  return { isOpen, open, close, setIsOpen };
}

export default useModal;
