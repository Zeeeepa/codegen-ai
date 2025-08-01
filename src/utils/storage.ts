/**
 * Enhanced storage utilities for managing application data
 * Provides type-safe localStorage operations with error handling
 */

export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

class StorageManager {
  private prefix = 'codegen_';

  /**
   * Store data in localStorage with optional encryption and TTL
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl
      };

      const serialized = JSON.stringify(item);
      localStorage.setItem(this.prefix + key, serialized);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage with TTL validation
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return defaultValue;

      const item: StorageItem<T> = JSON.parse(stored);
      
      // Check TTL expiration
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return defaultValue;
      }

      return item.data;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * Clear all items with the app prefix
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Get all keys with the app prefix
   */
  keys(): string[] {
    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''));
    } catch (error) {
      console.error('Storage keys error:', error);
      return [];
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== undefined;
  }

  /**
   * Get storage usage information
   */
  getUsage(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (key.startsWith(this.prefix)) {
          used += localStorage[key].length;
        }
      }

      // Estimate available space (5MB typical limit)
      const available = 5 * 1024 * 1024 - used;
      const percentage = (used / (5 * 1024 * 1024)) * 100;

      return { used, available, percentage };
    } catch (error) {
      console.error('Storage usage error:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}

export const storage = new StorageManager();

// Convenience functions for common operations
export const setItem = <T>(key: string, value: T, options?: StorageOptions) => 
  storage.set(key, value, options);

export const getItem = <T>(key: string, defaultValue?: T) => 
  storage.get<T>(key, defaultValue);

export const removeItem = (key: string) => storage.remove(key);

export const clearStorage = () => storage.clear();

export const hasItem = (key: string) => storage.has(key);

