/**
 * ============================================================
 * FILE: ui/preact/setup.js – Preact-Setup mit Hooks & EventBus
 * ============================================================
 */

import { h, render, Component } from 'https://esm.sh/preact@10.19.3';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(h);

/**
 * Custom Hook: Abonniert einen EventBus-Event.
 */
function useEventBus(eventBus, eventName, callback) {
  useEffect(() => {
    if (!eventBus || !eventName) return;
    const id = eventBus.subscribe(eventName, callback);
    return () => eventBus.unsubscribe(id);
  }, [eventBus, eventName, callback]);
}

/**
 * Custom Hook: Abonniert State-Änderungen (mit Selector).
 */
function useStateSelector(stateManager, selector) {
  const [value, setValue] = useState(() => {
    const state = stateManager.getState();
    return selector ? selector(state) : state;
  });

  useEffect(() => {
    const unsubscribe = stateManager.subscribe((state) => {
      const newValue = selector ? selector(state) : state;
      setValue(newValue);
    });
    return () => unsubscribe();
  }, [stateManager, selector]);

  return value;
}

export {
  h,
  render,
  Component,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  html,
  useEventBus,
  useStateSelector
};