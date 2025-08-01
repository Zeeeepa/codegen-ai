/**
 * Notification system for agent runs and system events
 * Handles browser notifications, in-app notifications, and event tracking
 */

import { toast } from './toast';

export type NotificationType = 'agent_run_started' | 'agent_run_completed' | 'agent_run_failed' | 'pr_created' | 'pr_merged' | 'system_error' | 'system_info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
}

export interface NotificationOptions {
  persistent?: boolean;
  showBrowserNotification?: boolean;
  showToast?: boolean;
  data?: any;
  actions?: NotificationAction[];
}

class NotificationManager {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private nextId = 1;
  private browserNotificationPermission: NotificationPermission = 'default';

  constructor() {
    this.initializeBrowserNotifications();
    this.loadNotifications();
  }

  /**
   * Initialize browser notification permissions
   */
  private async initializeBrowserNotifications() {
    if ('Notification' in window) {
      this.browserNotificationPermission = Notification.permission;
      
      if (this.browserNotificationPermission === 'default') {
        try {
          this.browserNotificationPermission = await Notification.requestPermission();
        } catch (error) {
          console.warn('Failed to request notification permission:', error);
        }
      }
    }
  }

  /**
   * Load notifications from storage
   */
  private loadNotifications() {
    try {
      const stored = localStorage.getItem('codegen_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Save notifications to storage
   */
  private saveNotifications() {
    try {
      localStorage.setItem('codegen_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Add a new notification
   */
  add(
    type: NotificationType,
    title: string,
    message: string,
    options: NotificationOptions = {}
  ): string {
    const id = `notification-${this.nextId++}`;
    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      data: options.data,
      actions: options.actions
    };

    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();
    this.notifyListeners();

    // Show browser notification if requested and permitted
    if (options.showBrowserNotification !== false && this.browserNotificationPermission === 'granted') {
      this.showBrowserNotification(notification);
    }

    // Show toast notification if requested
    if (options.showToast !== false) {
      this.showToastNotification(notification);
    }

    return id;
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification) {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        tag: notification.id,
        requireInteraction: notification.type === 'system_error'
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };

      // Auto-close after 5 seconds (except for errors)
      if (notification.type !== 'system_error') {
        setTimeout(() => browserNotification.close(), 5000);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Show toast notification
   */
  private showToastNotification(notification: Notification) {
    const toastType = this.getToastType(notification.type);
    toast[toastType](notification.title, notification.message, {
      persistent: notification.type === 'system_error',
      action: notification.actions?.[0] ? {
        label: notification.actions[0].label,
        onClick: () => this.handleNotificationAction(notification.id, notification.actions![0])
      } : undefined
    });
  }

  /**
   * Get notification icon based on type
   */
  private getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      agent_run_started: '🚀',
      agent_run_completed: '✅',
      agent_run_failed: '❌',
      pr_created: '🔄',
      pr_merged: '✅',
      system_error: '⚠️',
      system_info: 'ℹ️'
    };
    return iconMap[type] || 'ℹ️';
  }

  /**
   * Get toast type based on notification type
   */
  private getToastType(type: NotificationType): 'success' | 'error' | 'warning' | 'info' {
    const typeMap: Record<NotificationType, 'success' | 'error' | 'warning' | 'info'> = {
      agent_run_started: 'info',
      agent_run_completed: 'success',
      agent_run_failed: 'error',
      pr_created: 'info',
      pr_merged: 'success',
      system_error: 'error',
      system_info: 'info'
    };
    return typeMap[type] || 'info';
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  /**
   * Remove a notification
   */
  remove(id: string): boolean {
    const initialLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    
    if (this.notifications.length !== initialLength) {
      this.saveNotifications();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * Handle notification action
   */
  private handleNotificationAction(notificationId: string, action: NotificationAction): void {
    // This can be extended to handle different action types
    console.log('Notification action:', action.action, action.data);
    
    // Mark notification as read when action is taken
    this.markAsRead(notificationId);
  }

  /**
   * Get browser notification permission status
   */
  getBrowserNotificationPermission(): NotificationPermission {
    return this.browserNotificationPermission;
  }

  /**
   * Request browser notification permission
   */
  async requestBrowserNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      try {
        this.browserNotificationPermission = await Notification.requestPermission();
        return this.browserNotificationPermission;
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
      }
    }
    return 'denied';
  }
}

export const notifications = new NotificationManager();

// Convenience functions for common notification types
export const notifyAgentRunStarted = (agentRunId: string, message: string) =>
  notifications.add('agent_run_started', 'Agent Run Started', message, { data: { agentRunId } });

export const notifyAgentRunCompleted = (agentRunId: string, message: string) =>
  notifications.add('agent_run_completed', 'Agent Run Completed', message, { data: { agentRunId } });

export const notifyAgentRunFailed = (agentRunId: string, message: string) =>
  notifications.add('agent_run_failed', 'Agent Run Failed', message, { data: { agentRunId } });

export const notifyPRCreated = (prUrl: string, message: string) =>
  notifications.add('pr_created', 'Pull Request Created', message, { 
    data: { prUrl },
    actions: [{ label: 'View PR', action: 'open_url', data: { url: prUrl } }]
  });

export const notifyPRMerged = (prUrl: string, message: string) =>
  notifications.add('pr_merged', 'Pull Request Merged', message, { data: { prUrl } });

export const notifySystemError = (error: string, details?: string) =>
  notifications.add('system_error', 'System Error', details || error, { persistent: true });

export const notifySystemInfo = (title: string, message: string) =>
  notifications.add('system_info', title, message);

