import { useEffect, useRef } from 'react';

export type BackHandler = () => boolean;

interface RegisteredHandler {
  id: string;
  handler: BackHandler;
  priority: number;
}

// Global registry of back handlers sorted by priority descending
let handlers: RegisteredHandler[] = [];
let isInitialized = false;

/**
 * Initializes the history sentinel to capture phone hardware back button,
 * edge swipe-back gestures, and browser history pop events.
 */
export function initNavigationHistory() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  try {
    // Replace baseline state
    if (!window.history.state || window.history.state.lraSentinel !== 'active') {
      window.history.replaceState({ lraSentinel: 'base' }, '');
      window.history.pushState({ lraSentinel: 'active', t: Date.now() }, '');
    }
  } catch (e) {
    console.warn('Navigation history sentinel setup skipped:', e);
  }

  window.addEventListener('popstate', handlePopState);
}

/**
 * Popstate event handler for Android/phone back button & swipe back
 */
function handlePopState(e: PopStateEvent) {
  // Execute the highest priority active back handler
  const handled = executeTopHandler();

  if (handled) {
    // A component consumed the back button (closed modal, backed out of tab/subview, or showed exit prompt).
    // Re-push active sentinel so the phone back button remains captured for the next interaction.
    try {
      window.history.pushState({ lraSentinel: 'active', t: Date.now() }, '');
    } catch (err) {
      console.warn('Failed to re-push sentinel state:', err);
    }
  } else {
    // If no handlers consumed it and we are at true root, let the browser proceed.
    console.debug('No back handler consumed popstate');
  }
}

/**
 * Executes the topmost active back handler in descending order of priority.
 * Returns true if handled/consumed, false otherwise.
 */
export function executeTopHandler(): boolean {
  for (let i = 0; i < handlers.length; i++) {
    const item = handlers[i];
    try {
      const handled = item.handler();
      if (handled) {
        return true;
      }
    } catch (err) {
      console.error('Error executing back handler', item.id, err);
    }
  }
  return false;
}

/**
 * Manually trigger back action (e.g. for header back button)
 */
export function triggerAppBack(): boolean {
  return executeTopHandler();
}

/**
 * Register a back handler with a given priority.
 * Higher priority handlers are evaluated first.
 */
export function registerBackHandler(
  id: string,
  handler: BackHandler,
  priority: number = 10
): () => void {
  // Remove existing with same id if any
  handlers = handlers.filter((h) => h.id !== id);
  // Insert new handler
  handlers.push({ id, handler, priority });
  // Sort descending by priority
  handlers.sort((a, b) => b.priority - a.priority);

  return () => {
    handlers = handlers.filter((h) => h.id !== id);
  };
}

/**
 * React hook to register a back action handler when an element/modal/tab is active.
 * Automatically cleans up when unmounted or disabled.
 */
export function useBackHandler(
  handler: BackHandler,
  active: boolean = true,
  priority: number = 10,
  customId?: string
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;

    // Ensure history sentinel is running
    initNavigationHistory();

    const id = customId || `bh_${Math.random().toString(36).substring(2, 9)}`;
    const unregister = registerBackHandler(id, () => handlerRef.current(), priority);

    return () => {
      unregister();
    };
  }, [active, priority, customId]);
}
