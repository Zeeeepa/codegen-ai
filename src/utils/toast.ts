/**
 * Toast notification system
 * Provides a simple, lightweight toast notification system
 */

import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];
  private nextId = 1;

  /**
   * Add a toast notification
   */
  private addToast(type: ToastType, title: string, message?: string, options: ToastOptions = {}): string {
    const id = `toast-${this.nextId++}`;
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration: options.duration ?? (type === 'error' ? 5000 : 3000),
      persistent: options.persistent ?? false,
      action: options.action
    };

    this.toasts.push(toast);
    this.notifyListeners();

    // Auto-remove toast after duration (unless persistent)
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        this.removeToast(id);
      }, toast.duration);
    }

    return id;
  }

  /**
   * Show success toast
   */
  success(title: string, message?: string, options?: ToastOptions): string {
    return this.addToast('success', title, message, options);
  }

  /**
   * Show error toast
   */
  error(title: string, message?: string, options?: ToastOptions): string {
    return this.addToast('error', title, message, options);
  }

  /**
   * Show warning toast
   */
  warning(title: string, message?: string, options?: ToastOptions): string {
    return this.addToast('warning', title, message, options);
  }

  /**
   * Show info toast
   */
  info(title: string, message?: string, options?: ToastOptions): string {
    return this.addToast('info', title, message, options);
  }

  /**
   * Remove a specific toast
   */
  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toasts = [];
    this.notifyListeners();
  }

  /**
   * Get all current toasts
   */
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  /**
   * Subscribe to toast changes
   */
  subscribe(listener: (toasts: Toast[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of toast changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  /**
   * Show a loading toast that can be updated
   */
  loading(title: string, message?: string): {
    id: string;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    update: (title: string, message?: string) => void;
    remove: () => void;
  } {
    const id = this.addToast('info', title, message, { persistent: true });

    return {
      id,
      success: (newTitle: string, newMessage?: string) => {
        this.removeToast(id);
        this.success(newTitle, newMessage);
      },
      error: (newTitle: string, newMessage?: string) => {
        this.removeToast(id);
        this.error(newTitle, newMessage);
      },
      update: (newTitle: string, newMessage?: string) => {
        const toastIndex = this.toasts.findIndex(t => t.id === id);
        if (toastIndex !== -1) {
          this.toasts[toastIndex] = { ...this.toasts[toastIndex], title: newTitle, message: newMessage };
          this.notifyListeners();
        }
      },
      remove: () => this.removeToast(id)
    };
  }
}

export const toast = new ToastManager();

// React hook for using toasts in components
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    setToasts(toast.getToasts()); // Get initial toasts
    return unsubscribe;
  }, []);

  return {
    toasts,
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    info: toast.info.bind(toast),
    loading: toast.loading.bind(toast),
    remove: toast.removeToast.bind(toast),
    clearAll: toast.clearAll.bind(toast)
  };
}

// Convenience functions
export const showSuccess = (title: string, message?: string, options?: ToastOptions) => 
  toast.success(title, message, options);

export const showError = (title: string, message?: string, options?: ToastOptions) => 
  toast.error(title, message, options);

export const showWarning = (title: string, message?: string, options?: ToastOptions) => 
  toast.warning(title, message, options);

export const showInfo = (title: string, message?: string, options?: ToastOptions) => 
  toast.info(title, message, options);

// Add React import at the top (this will be handled by the bundler)
declare global {
  const React: typeof import('react');
}
