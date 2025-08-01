// Cloudflare Worker webhook integration
// Handles real-time PR updates via Cloudflare Workers

import type { PullRequest, CloudflareWebhookEvent, CloudflareConfig } from '../types';

export class CloudflareWebhookService {
  private config: CloudflareConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private listeners: Set<(event: CloudflareWebhookEvent) => void> = new Set();
  private eventSource: EventSource | null = null;

  constructor(config: CloudflareConfig) {
    this.config = config;
  }

  // Connect to Cloudflare Worker for real-time updates
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For now, we'll use polling since Cloudflare Workers KV is eventually consistent
        // In production, you'd want to use Durable Objects for real-time connections
        this.connectSSE();
        this.isConnected = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Connect to Server-Sent Events stream
  private connectSSE() {
    if (!this.isConnected) return;

    try {
      this.eventSource = new EventSource(`${this.config.workerUrl}/events`);
      
      this.eventSource.onopen = () => {
        console.log('SSE connection opened');
        this.reconnectAttempts = 0;
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'connected') {
            console.log('SSE connected at:', data.timestamp);
          } else if (data.type === 'heartbeat') {
            // Heartbeat - connection is alive
          } else if (data.action) {
            // This is a webhook event
            console.log('Received real-time webhook event:', data);
            this.notifyListeners(data);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.eventSource?.close();
        this.eventSource = null;
        this.handleReconnect();
      };
      
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.handleReconnect();
    }
  }

  // Disconnect from the service
  disconnect() {
    this.isConnected = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
    console.log('Cloudflare webhook service disconnected');
  }

  // Add event listener
  addEventListener(listener: (event: CloudflareWebhookEvent) => void) {
    this.listeners.add(listener);
  }

  // Remove event listener
  removeEventListener(listener: (event: CloudflareWebhookEvent) => void) {
    this.listeners.delete(listener);
  }

  // Notify all listeners of an event
  private notifyListeners(event: CloudflareWebhookEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in webhook event listener:', error);
      }
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      workerUrl: this.config.workerUrl
    };
  }

  // Handle reconnection with exponential backoff
  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.isConnected) {
          this.connectSSE();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.isConnected = false;
    }
  }

  // Setup GitHub webhook for a repository
  async setupGitHubWebhook(repoOwner: string, repoName: string, githubToken: string): Promise<boolean> {
    try {
      const webhookConfig = {
        name: 'web',
        active: true,
        events: ['pull_request'],
        config: {
          url: this.config.workerUrl,
          content_type: 'json',
          insecure_ssl: '0'
        }
      };

      const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/hooks`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      });

      if (response.ok) {
        console.log(`Webhook successfully configured for ${repoOwner}/${repoName}`);
        return true;
      } else {
        const error = await response.text();
        console.error(`Failed to create webhook: ${error}`);
        return false;
      }
    } catch (error) {
      console.error(`Error setting up webhook: ${error}`);
      return false;
    }
  }
}

// Factory function to create a CloudflareWebhookService instance
export function getCloudflareWebhookService(): CloudflareWebhookService {
  const config: CloudflareConfig = {
    workerUrl: import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://webhook-gateway.pixeliumperfecto.workers.dev',
    apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN,
    accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    workerName: import.meta.env.VITE_CLOUDFLARE_WORKER_NAME || 'webhook-gateway'
  };
  
  return new CloudflareWebhookService(config);
}

export type { CloudflareWebhookEvent, CloudflareConfig };