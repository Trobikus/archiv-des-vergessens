/**
 * ============================================================
 * FILE: ui/preact/setup.js – Preact-Setup mit Hooks & EventBus
 * ============================================================
 */

import { h, render, Component } from 'preact';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext, 
  useReducer,
  useImperativeHandle,
  useLayoutEffect,
  useDebugValue
} from 'preact/hooks';
import htm from 'htm';

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

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Custom Hook: Abonniert State-Änderungen (mit Selector).
 */
function useStateSelector(stateManager, selector) {
  const [value, setValue] = useState(() => {
    if (!stateManager || !stateManager.isInitialized()) {
      return selector ? selector({}) : null;
    }
    const state = stateManager.getState();
    return selector ? selector(state) : state;
  });

  const lastValueRef = useRef(value);
  lastValueRef.current = value;

  useEffect(() => {
    if (!stateManager) return;
    const id = stateManager.subscribe((state) => {
      const newValue = selector ? selector(state) : state;
      if (!shallowEqual(lastValueRef.current, newValue)) {
        setValue(newValue);
      }
    });
    return () => stateManager.unsubscribe(id);
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
  useContext,
  useReducer,
  useImperativeHandle,
  useLayoutEffect,
  useDebugValue,
  html,
  useEventBus,
  useStateSelector
};