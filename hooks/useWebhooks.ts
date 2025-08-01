import { useState, useEffect, useRef } from 'react';
import type { PullRequest } from '../types';
import { getCloudflareWebhookService, type CloudflareWebhookEvent } from '../services/cloudflare_webhooks';

export function useWebhooks(onPullRequestUpdate: (pr: PullRequest, action: string) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloudflareServiceRef = useRef(getCloudflareWebhookService());

  useEffect(() => {
    const cloudflareService = cloudflareServiceRef.current;

    // Event handler for Cloudflare webhook events
    const handleWebhookEvent = (event: CloudflareWebhookEvent) => {
      try {
        // Handle different PR actions
        if (event.action && event.pull_request) {
          onPullRequestUpdate(event.pull_request, event.action);
        }
      } catch (err) {
        console.error('Failed to process webhook event:', err);
      }
    };

    // Connect to Cloudflare Worker service
    const connectWebhook = async () => {
      try {
        setError(null);
        
        // Add event listener
        cloudflareService.addEventListener(handleWebhookEvent);
        
        // Connect to the service
        await cloudflareService.connect();
        
        setIsConnected(true);
        console.log('Cloudflare webhook connection established');
      } catch (err) {
        setIsConnected(false);
        setError('Failed to establish Cloudflare webhook connection');
        console.error('Cloudflare webhook setup error:', err);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          connectWebhook();
        }, 5000);
      }
    };

    connectWebhook();

    // Cleanup on unmount
    return () => {
      cloudflareService.removeEventListener(handleWebhookEvent);
      cloudflareService.disconnect();
    };
  }, [onPullRequestUpdate]);

  const reconnect = () => {
    setError(null);
    setIsConnected(false);
    
    // Disconnect and reconnect
    const cloudflareService = cloudflareServiceRef.current;
    cloudflareService.disconnect();
    
    // Reconnect after a short delay
    setTimeout(async () => {
      try {
        await cloudflareService.connect();
        setIsConnected(true);
      } catch (err) {
        setError('Reconnection failed');
        console.error('Reconnection error:', err);
      }
    }, 1000);
  };

  // Get additional status information
  const getStatus = () => {
    return cloudflareServiceRef.current.getConnectionStatus();
  };

  return {
    isConnected,
    error,
    reconnect,
    getStatus,
  };
}