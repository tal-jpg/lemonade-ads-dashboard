import { create } from 'zustand';

/**
 * Transient UI state: toasts and the global "blocking action" flag.
 *
 * Toasts are queued rather than replaced, so two quick successes both get seen.
 */

export type ToastKind = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  /** Milliseconds on screen. */
  duration: number;
};

type UIState = {
  toasts: Toast[];
  showToast: (message: string, kind?: ToastKind, duration?: number) => void;
  dismissToast: (id: string) => void;
};

let counter = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  showToast: (message, kind = 'info', duration = 2600) => {
    counter += 1;
    const toast: Toast = { id: `t${counter}`, kind, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helpers so services can raise a toast without a hook. */
export const toast = {
  success: (message: string) => useUIStore.getState().showToast(message, 'success'),
  error: (message: string) => useUIStore.getState().showToast(message, 'error', 3200),
  info: (message: string) => useUIStore.getState().showToast(message, 'info'),
};
