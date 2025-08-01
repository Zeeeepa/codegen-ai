// Web-compatible storage utilities to replace @raycast/api LocalStorage and Cache

// LocalStorage replacement
export class LocalStorage {
  static async getItem<T = string>(key: string): Promise<T | undefined> {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        return undefined;
      }
      // For generic types, we assume the caller knows what they're doing
      // In a real implementation, you might want to add JSON parsing for non-string types
      return value as T;
    } catch (error) {
      console.error(`Failed to get item from localStorage: ${key}`, error);
      return undefined;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item in localStorage: ${key}`, error);
      throw error;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item from localStorage: ${key}`, error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage', error);
      throw error;
    }
  }

  static async allItems(): Promise<Record<string, string>> {
    try {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            items[key] = value;
          }
        }
      }
      return items;
    } catch (error) {
      console.error('Failed to get all items from localStorage', error);
      return {};
    }
  }
}

// Cache replacement using localStorage with expiration
export class Cache {
  private readonly CACHE_PREFIX: string;
  private readonly EXPIRY_SUFFIX = '_expiry';
  private namespace: string;
  private capacity: number;

  constructor(options?: { namespace?: string; capacity?: number }) {
    this.namespace = options?.namespace || 'default';
    this.capacity = options?.capacity || 10 * 1024 * 1024; // 10MB default
    this.CACHE_PREFIX = `cache_${this.namespace}_`;
  }

  get(key: string): string | undefined {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const expiryKey = cacheKey + this.EXPIRY_SUFFIX;
      
      const expiry = localStorage.getItem(expiryKey);
      if (expiry && Date.now() > parseInt(expiry)) {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(expiryKey);
        return undefined;
      }
      
      const value = localStorage.getItem(cacheKey);
      return value || undefined;
    } catch (error) {
      console.error(`Failed to get item from cache: ${key}`, error);
      return undefined;
    }
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      localStorage.setItem(cacheKey, value);
      
      if (ttlSeconds) {
        const expiryKey = cacheKey + this.EXPIRY_SUFFIX;
        const expiry = Date.now() + (ttlSeconds * 1000);
        localStorage.setItem(expiryKey, expiry.toString());
      }
    } catch (error) {
      console.error(`Failed to set item in cache: ${key}`, error);
      throw error;
    }
  }

  remove(key: string): void {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const expiryKey = cacheKey + this.EXPIRY_SUFFIX;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(expiryKey);
    } catch (error) {
      console.error(`Failed to remove item from cache: ${key}`, error);
      throw error;
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear cache', error);
      throw error;
    }
  }

  // Static methods for backward compatibility
  static async get(key: string): Promise<string | undefined> {
    const cache = new Cache();
    return cache.get(key);
  }

  static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const cache = new Cache();
    cache.set(key, value, ttlSeconds);
  }

  static async remove(key: string): Promise<void> {
    const cache = new Cache();
    cache.remove(key);
  }

  static async clear(): Promise<void> {
    const cache = new Cache();
    cache.clear();
  }
}

// HUD replacement (simple alert for web)
export async function showHUD(message: string): Promise<void> {
  console.log(`HUD: ${message}`);
  // For web, we can use a simple alert or implement a custom HUD component
  // For now, just log to console
}