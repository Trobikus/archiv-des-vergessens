import { h, render, Component } from 'https://esm.sh/preact@10.19.3';
import { useState, useEffect, useCallback, useMemo } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(h);

function useEventBus(eventBus, eventName, callback) {
    useEffect(() => {
        if (!eventBus || !eventName) return;
        const subId = eventBus.subscribe(eventName, callback);
        return () => eventBus.unsubscribe(subId);
    }, [eventBus, eventName, callback]);
}

export { h, render, Component, useState, useEffect, useCallback, useMemo, html, useEventBus };