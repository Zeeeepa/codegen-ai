import type { Project, GlobalSettings, AgentRun, CodegenAgentRunResponse } from '../types';
import { AgentRunStatus as AgentRunStatusEnum, CodegenAPIError } from '../types';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const CODEGEN_API_BASE_URL = "https://api.codegen.com/v1";
const CORS_PROXY_URL = "https://corsproxy.io/?"; // More reliable CORS proxy
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const DEFAULT_RETRY_BACKOFF_FACTOR = 2.0;
const DEFAULT_POLL_INTERVAL = 3000; // 3 seconds
const RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
const RATE_LIMIT_PERIOD_MS = 60000; // 1 minute

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

enum SourceType {
  LOCAL = "LOCAL",
  SLACK = "SLACK",
  GITHUB = "GITHUB",
  GITHUB_CHECK_SUITE = "GITHUB_CHECK_SUITE",
  LINEAR = "LINEAR",
  API = "API",
  CHAT = "CHAT",
  JIRA = "JIRA"
}

enum MessageType {
  ACTION = "ACTION",
  PLAN_EVALUATION = "PLAN_EVALUATION",
  FINAL_ANSWER = "FINAL_ANSWER",
  ERROR = "ERROR",
  USER_MESSAGE = "USER_MESSAGE",
  USER_GITHUB_ISSUE_COMMENT = "USER_GITHUB_ISSUE_COMMENT",
  INITIAL_PR_GENERATION = "INITIAL_PR_GENERATION",
  DETECT_PR_ERRORS = "DETECT_PR_ERRORS",
  FIX_PR_ERRORS = "FIX_PR_ERRORS",
  PR_CREATION_FAILED = "PR_CREATION_FAILED",
  PR_EVALUATION = "PR_EVALUATION",
  COMMIT_EVALUATION = "COMMIT_EVALUATION",
  AGENT_RUN_LINK = "AGENT_RUN_LINK"
}

enum AgentRunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  PAUSED = "paused"
}

interface ClientConfig {
  apiToken: string;
  orgId: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  retryBackoffFactor: number;
  pollInterval: number;
  rateLimitRequestsPerPeriod: number;
  rateLimitPeriodMs: number;
  enableCaching: boolean;
  cacheTtlMs: number;
  cacheMaxSize: number;
  enableMetrics: boolean;
  logRequests: boolean;
  logResponses: boolean;
  userAgent: string;
}

interface RequestMetrics {
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  timestamp: Date;
  requestId: string;
  cached: boolean;
}

interface ClientStats {
  uptimeMs: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  cacheHitRate: number;
  statusCodeDistribution: Record<number, number>;
  recentRequests: RequestMetrics[];
}

interface RateLimitInfo {
  currentRequests: number;
  maxRequests: number;
  periodMs: number;
  usagePercentage: number;
  resetTime: Date;
}

// ============================================================================
// DATA MODELS
// ============================================================================

interface UserResponse {
  id: number;
  email?: string;
  github_user_id: string;
  github_username: string;
  avatar_url?: string;
  full_name?: string;
}

interface GithubPullRequestResponse {
  id: number;
  title: string;
  url: string;
  created_at: string;
}

interface AgentRunLogResponse {
  agent_run_id: number;
  created_at: string;
  message_type: string;
  thought?: string;
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_output?: Record<string, any>;
  observation?: Record<string, any> | string;
}

interface OrganizationSettings {
  // Add specific settings fields as they become available
}

interface OrganizationResponse {
  id: number;
  name: string;
  settings: OrganizationSettings;
}

interface PaginatedResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface UsersResponse extends PaginatedResponse {
  items: UserResponse[];
}

interface AgentRunsResponse extends PaginatedResponse {
  items: CodegenAgentRunResponse[];
}

interface OrganizationsResponse extends PaginatedResponse {
  items: OrganizationResponse[];
}

interface AgentRunWithLogsResponse {
  id: number;
  organization_id: number;
  logs: AgentRunLogResponse[];
  status?: string;
  created_at?: string;
  web_url?: string;
  result?: string;
  metadata?: Record<string, any>;
  total_logs?: number;
  page?: number;
  size?: number;
  pages?: number;
}

interface WebhookEvent {
  event_type: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

interface BulkOperationResult {
  total_items: number;
  successful_items: number;
  failed_items: number;
  success_rate: number;
  duration_seconds: number;
  errors: Array<{
    index: number;
    item: string;
    error: string;
    error_type: string;
  }>;
  results: any[];
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRatePercentage: number;
  ttlMs: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const generateRequestId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const validatePagination = (skip: number, limit: number): void => {
  if (skip < 0) {
    throw new Error("skip must be >= 0");
  }
  if (!(1 <= limit && limit <= 100)) {
    throw new Error("limit must be between 1 and 100");
  }
};

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly periodMs: number;

  constructor(maxRequests: number, periodMs: number) {
    this.maxRequests = maxRequests;
    this.periodMs = periodMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests
    this.requests = this.requests.filter(
      reqTime => now - reqTime < this.periodMs
    );

    if (this.requests.length >= this.maxRequests) {
      const sleepTime = this.periodMs - (now - this.requests[0]);
      if (sleepTime > 0) {
        console.log(`Rate limit reached, sleeping for ${sleepTime}ms`);
        await delay(sleepTime);
      }
    }

    this.requests.push(now);
  }

  getCurrentUsage(): RateLimitInfo {
    const now = Date.now();
    const recentRequests = this.requests.filter(
      reqTime => now - reqTime < this.periodMs
    );

    return {
      currentRequests: recentRequests.length,
      maxRequests: this.maxRequests,
      periodMs: this.periodMs,
      usagePercentage: (recentRequests.length / this.maxRequests) * 100,
      resetTime: new Date(now + this.periodMs)
    };
  }
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

class CacheManager {
  private cache: Map<string, any> = new Map();
  private timestamps: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private hits = 0;
  private misses = 0;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): any | null {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    // Check if expired
    const timestamp = this.timestamps.get(key)!;
    if (Date.now() - timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      this.accessCounts.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      if (this.timestamps.size > 0) {
        const oldestKey = Array.from(this.timestamps.entries())
          .sort(([, a], [, b]) => a - b)[0][0];
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
        this.accessCounts.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    this.accessCounts.set(key, this.accessCounts.get(key) || 0);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
    this.accessCounts.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatePercentage: hitRate,
      ttlMs: this.ttlMs
    };
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class WebhookHandler {
  private secretKey?: string;
  private handlers: Map<string, Array<(payload: Record<string, any>) => void>> = new Map();
  private middleware: Array<(payload: Record<string, any>) => Record<string, any>> = [];

  constructor(secretKey?: string) {
    this.secretKey = secretKey;
  }

  registerHandler(eventType: string, handler: (payload: Record<string, any>) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    console.log(`[WebhookHandler] Registered handler for event type: ${eventType}`);
  }

  registerMiddleware(middleware: (payload: Record<string, any>) => Record<string, any>): void {
    this.middleware.push(middleware);
  }

  verifySignature(payload: string, signature: string): boolean {
    if (!this.secretKey) {
      console.warn("[WebhookHandler] No secret key configured for signature verification");
      return true;
    }

    // Note: In a real implementation, you'd use crypto.createHmac for signature verification
    // This is a simplified version
    const expectedSignature = `sha256=${this.secretKey}`;
    return signature === expectedSignature;
  }

  handleWebhook(payload: Record<string, any>, signature?: string): void {
    try {
      // Verify signature if provided
      if (signature && !this.verifySignature(JSON.stringify(payload), signature)) {
        throw new Error("Invalid webhook signature");
      }

      // Apply middleware
      let processedPayload = payload;
      for (const middleware of this.middleware) {
        processedPayload = middleware(processedPayload);
      }

      const eventType = processedPayload.event_type;
      if (!eventType) {
        throw new Error("Missing event_type in webhook payload");
      }

      // Execute handlers
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(processedPayload);
          } catch (error) {
            console.error(`[WebhookHandler] Handler error for ${eventType}:`, error);
          }
        }
        console.log(`[WebhookHandler] Successfully processed webhook event: ${eventType}`);
      } else {
        console.warn(`[WebhookHandler] No handler registered for event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`[WebhookHandler] Error processing webhook:`, error);
      throw error;
    }
  }
}

class BulkOperationManager {
  private maxWorkers: number;
  private batchSize: number;

  constructor(maxWorkers: number = 5, batchSize: number = 100) {
    this.maxWorkers = maxWorkers;
    this.batchSize = batchSize;
  }

  async executeBulkOperation<T, R>(
    operationFunc: (item: T) => Promise<R>,
    items: T[],
    progressCallback?: (completed: number, total: number) => void
  ): Promise<BulkOperationResult> {
    const startTime = Date.now();
    const results: R[] = [];
    const errors: Array<{ index: number; item: string; error: string; error_type: string }> = [];
    let successfulCount = 0;

    // Process items in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await operationFunc(item);
          results.push(result);
          successfulCount++;
          return { success: true, index: globalIndex };
        } catch (error) {
          const errorInfo = {
            index: globalIndex,
            item: String(item),
            error: error instanceof Error ? error.message : String(error),
            error_type: error instanceof Error ? error.constructor.name : 'Unknown'
          };
          errors.push(errorInfo);
          console.error(`[BulkOperation] Failed for item ${globalIndex}:`, error);
          return { success: false, index: globalIndex };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Call progress callback
      if (progressCallback) {
        const completed = Math.min(i + this.batchSize, items.length);
        progressCallback(completed, items.length);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    const successRate = items.length > 0 ? successfulCount / items.length : 0;

    return {
      total_items: items.length,
      successful_items: successfulCount,
      failed_items: errors.length,
      success_rate: successRate,
      duration_seconds: duration,
      errors,
      results
    };
  }
}

class MetricsCollector {
  private requests: RequestMetrics[] = [];
  private startTime: Date = new Date();

  recordRequest(
    method: string,
    endpoint: string,
    durationMs: number,
    statusCode: number,
    requestId: string,
    cached: boolean = false
  ): void {
    const metric: RequestMetrics = {
      method,
      endpoint,
      statusCode,
      durationMs,
      timestamp: new Date(),
      requestId,
      cached
    };

    this.requests.push(metric);

    // Keep only recent requests (last 1000)
    if (this.requests.length > 1000) {
      this.requests = this.requests.slice(-1000);
    }
  }

  getStats(): ClientStats {
    if (this.requests.length === 0) {
      return {
        uptimeMs: 0,
        totalRequests: 0,
        totalErrors: 0,
        errorRate: 0,
        requestsPerMinute: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        statusCodeDistribution: {},
        recentRequests: []
      };
    }

    const uptimeMs = Date.now() - this.startTime.getTime();
    const totalRequests = this.requests.length;
    const errorRequests = this.requests.filter(r => r.statusCode >= 400);
    const cachedRequests = this.requests.filter(r => r.cached);

    const avgResponseTime = this.requests.reduce((sum, r) => sum + r.durationMs, 0) / totalRequests;
    const errorRate = totalRequests > 0 ? errorRequests.length / totalRequests : 0;
    const cacheHitRate = totalRequests > 0 ? cachedRequests.length / totalRequests : 0;
    const requestsPerMinute = totalRequests / (uptimeMs / 60000);

    // Status code distribution
    const statusCodes: Record<number, number> = {};
    for (const request of this.requests) {
      statusCodes[request.statusCode] = (statusCodes[request.statusCode] || 0) + 1;
    }

    return {
      uptimeMs,
      totalRequests,
      totalErrors: errorRequests.length,
      errorRate,
      requestsPerMinute,
      averageResponseTime: avgResponseTime,
      cacheHitRate,
      statusCodeDistribution: statusCodes,
      recentRequests: this.requests.slice(-10)
    };
  }

  reset(): void {
    this.requests = [];
    this.startTime = new Date();
  }
}

// ============================================================================
// MAIN CLIENT CLASS
// ============================================================================

class CodegenClient {
  private config: ClientConfig;
  private rateLimiter: RateLimiter;
  private cache: CacheManager | null;
  private metrics: MetricsCollector | null;
  private webhookHandler: WebhookHandler | null;
  private bulkManager: BulkOperationManager | null;
  private startTime: Date = new Date();

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      apiToken: config.apiToken || '',
      orgId: config.orgId || '',
      baseUrl: config.baseUrl || CODEGEN_API_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || DEFAULT_RETRY_ATTEMPTS,
      retryDelay: config.retryDelay || DEFAULT_RETRY_DELAY,
      retryBackoffFactor: config.retryBackoffFactor || DEFAULT_RETRY_BACKOFF_FACTOR,
      pollInterval: config.pollInterval || DEFAULT_POLL_INTERVAL,
      rateLimitRequestsPerPeriod: config.rateLimitRequestsPerPeriod || RATE_LIMIT_REQUESTS_PER_MINUTE,
      rateLimitPeriodMs: config.rateLimitPeriodMs || RATE_LIMIT_PERIOD_MS,
      enableCaching: config.enableCaching !== false,
      cacheTtlMs: config.cacheTtlMs || 300000, // 5 minutes
      cacheMaxSize: config.cacheMaxSize || 128,
      enableMetrics: config.enableMetrics !== false,
      logRequests: config.logRequests !== false,
      logResponses: config.logResponses || false,
      userAgent: config.userAgent || 'codegen-typescript-client/2.0.0'
    };

    if (!this.config.apiToken) {
      throw new Error("API token is required");
    }

    this.rateLimiter = new RateLimiter(
      this.config.rateLimitRequestsPerPeriod,
      this.config.rateLimitPeriodMs
    );

    this.cache = this.config.enableCaching 
      ? new CacheManager(this.config.cacheMaxSize, this.config.cacheTtlMs)
      : null;

    this.metrics = this.config.enableMetrics 
      ? new MetricsCollector()
      : null;

    this.webhookHandler = new WebhookHandler(); // Always enable webhooks
    this.bulkManager = new BulkOperationManager(5, 100); // Enable bulk operations

    console.log(`Initialized CodegenClient with base URL: ${this.config.baseUrl}`);
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    useCache: boolean = false,
    body?: object
  ): Promise<T> {
    return this.makeRequestWithFallback<T>(method, endpoint, useCache, body, false);
  }

  private async makeRequestWithFallback<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    useCache: boolean = false,
    body?: object,
    useProxy: boolean = false
  ): Promise<T> {
    const requestId = generateRequestId();

    // Debug: Log the request details (without sensitive data)
    const baseUrl = useProxy ? CORS_PROXY_URL + this.config.baseUrl : this.config.baseUrl;
    
    // Determine if the endpoint needs organization ID
    // User-specific endpoints don't need org ID, organization-specific endpoints do
    const needsOrgId = !endpoint.startsWith('/users/') && !endpoint.startsWith('/organizations/');
    const url = useProxy 
      ? `${CORS_PROXY_URL}${this.config.baseUrl}${needsOrgId ? `/organizations/${this.config.orgId}` : ''}${endpoint}`
      : `${this.config.baseUrl}${needsOrgId ? `/organizations/${this.config.orgId}` : ''}${endpoint}`;
    
    console.log(`[CodegenAPI] Making request to: ${url}`);
    console.log(`[CodegenAPI] Method: ${method}`);
    console.log(`[CodegenAPI] Has API Token: ${!!this.config.apiToken}`);
    console.log(`[CodegenAPI] Org ID: ${this.config.orgId}`);
    console.log(`[CodegenAPI] Request ID: ${requestId}`);
    console.log(`[CodegenAPI] Using proxy: ${useProxy}`);
    console.log(`[CodegenAPI] Needs org ID: ${needsOrgId}`);

    // Rate limiting
    await this.rateLimiter.waitIfNeeded();

    // Check cache
    let cacheKey: string | null = null;
    if (useCache && this.cache && method === 'GET') {
      cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult !== null) {
        console.debug(`Cache hit for ${endpoint} (request_id: ${requestId})`);
        if (this.metrics) {
          this.metrics.recordRequest(method, endpoint, 0, 200, requestId, true);
        }
        return cachedResult;
      }
    }

    // Make request with retry logic
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (this.config.logRequests) {
          console.info(`Making ${method} request to ${endpoint} (request_id: ${requestId}, attempt: ${attempt + 1})`);
        }

    const headers = {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent
    };
    
    // Debug: Log token format (without exposing the actual token)
    console.log(`[CodegenAPI] Token format: ${this.config.apiToken.substring(0, 10)}...${this.config.apiToken.substring(this.config.apiToken.length - 4)} (length: ${this.config.apiToken.length})`);
    console.log(`[CodegenAPI] Authorization header: Bearer ${this.config.apiToken.substring(0, 10)}...${this.config.apiToken.substring(this.config.apiToken.length - 4)}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        console.log(`[CodegenAPI] Attempt ${attempt + 1}: Making fetch request...`);
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        
        console.log(`[CodegenAPI] Response status: ${response.status}`);
        console.log(`[CodegenAPI] Response headers:`, Object.fromEntries(response.headers.entries()));

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (this.config.logRequests) {
          console.info(`Request completed in ${duration}ms - Status: ${response.status} (request_id: ${requestId})`);
        }

        // Record metrics
        if (this.metrics) {
          this.metrics.recordRequest(method, endpoint, duration, response.status, requestId);
        }

        // Handle different status codes
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60') * 1000;
          console.warn(`Rate limited, waiting ${retryAfter}ms`);
          await delay(retryAfter);
          continue;
        }

        if (response.status === 401) {
          throw new CodegenAPIError('Invalid API token or insufficient permissions', response.status);
        }

        if (response.status === 404) {
          throw new CodegenAPIError('Requested resource not found', response.status);
        }

        // Read response body once and store it
        let responseText: string;
        let responseData: any;
        
        try {
          responseText = await response.text();
          
          // Log response if enabled
          if (this.config.logResponses && response.ok) {
            console.debug(`Response: ${responseText}`);
          }
          
          // Parse JSON if response is ok
          if (response.ok && responseText) {
            try {
              responseData = JSON.parse(responseText);
            } catch (parseError) {
              console.error(`[CodegenAPI] Failed to parse JSON response:`, parseError);
              throw new CodegenAPIError(`Invalid JSON response: ${parseError}`, response.status);
            }
          }
        } catch (readError) {
          console.error(`[CodegenAPI] Failed to read response body:`, readError);
          throw new CodegenAPIError(`Failed to read response: ${readError}`, response.status);
        }

        if (response.status >= 400) {
          console.error(`[CodegenAPI] HTTP ${response.status} error response:`, responseText);
          console.error(`[CodegenAPI] Response headers:`, Object.fromEntries(response.headers.entries()));
          
          throw new CodegenAPIError(
            `API request failed: ${response.status} - ${responseText}`,
            response.status,
            { errorText: responseText, headers: Object.fromEntries(response.headers.entries()) }
          );
        }

        if (response.status >= 500) {
          throw new CodegenAPIError(`Server error: ${response.status}`, response.status);
        }

        if (!response.ok) {
          const message = responseData?.message || `API request failed: ${response.status}`;
          throw new CodegenAPIError(message, response.status, responseData);
        }

        const result = responseData as T;

        // Cache successful GET requests
        if (cacheKey && response.ok) {
          this.cache!.set(cacheKey, result);
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        console.error(`[CodegenAPI] Request error (attempt ${attempt + 1}):`, error);
        
        // Check if this is a CORS error and we haven't tried the proxy yet
        if (!useProxy && error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.log(`[CodegenAPI] CORS error detected, retrying with proxy...`);
          return await this.makeRequestWithFallback<T>(method, endpoint, useCache, body, true);
        }
        
        if (error instanceof CodegenAPIError) {
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          console.error(`[CodegenAPI] Request failed after ${this.config.maxRetries} retries: ${error}`);
          throw new CodegenAPIError(`Request failed after ${this.config.maxRetries} retries: ${error}`);
        }

        const sleepTime = this.config.retryDelay * Math.pow(this.config.retryBackoffFactor, attempt);
        console.warn(`[CodegenAPI] Request failed (attempt ${attempt + 1}), retrying in ${sleepTime}ms: ${error}`);
        await delay(sleepTime);
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  // ========================================================================
  // AGENT ENDPOINTS
  // ========================================================================

  async createAgentRun(
    prompt: string,
    images?: string[],
    metadata?: Record<string, any>
  ): Promise<CodegenAgentRunResponse> {
    // Validate inputs
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Prompt cannot be empty");
    }
    if (prompt.length > 50000) {
      throw new Error("Prompt cannot exceed 50,000 characters");
    }
    if (images && images.length > 10) {
      throw new Error("Cannot include more than 10 images");
    }

    const data = { prompt, images, metadata };
    return this.makeRequest<CodegenAgentRunResponse>('POST', '/agent/run', false, data);
  }

  async getAgentRun(agentRunId: number): Promise<CodegenAgentRunResponse> {
    return this.makeRequest<CodegenAgentRunResponse>('GET', `/agent/run/${agentRunId}`, true);
  }

  async listAgentRuns(
    userId?: number,
    sourceType?: SourceType,
    skip: number = 0,
    limit: number = 100
  ): Promise<{ items: CodegenAgentRunResponse[]; total: number; page: number; size: number; pages: number }> {
    validatePagination(skip, limit);

    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    if (userId) params.append('user_id', userId.toString());
    if (sourceType) params.append('source_type', sourceType);

    return this.makeRequest('GET', `/agent/runs?${params.toString()}`, true);
  }

  async resumeAgentRun(
    agentRunId: number,
    prompt: string,
    images?: string[]
  ): Promise<CodegenAgentRunResponse> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Prompt cannot be empty");
    }

    const data = { agent_run_id: agentRunId, prompt, images };
    return this.makeRequest<CodegenAgentRunResponse>('POST', '/agent/run/resume', false, data);
  }

  async getAgentRunLogs(
    agentRunId: number,
    skip: number = 0,
    limit: number = 100
  ): Promise<{
    id: number;
    organization_id: number;
    logs: Array<{
      agent_run_id: number;
      created_at: string;
      message_type: string;
      thought?: string;
      tool_name?: string;
      tool_input?: any;
      tool_output?: any;
      observation?: any;
    }>;
    status?: string;
    created_at?: string;
    web_url?: string;
    result?: string;
    metadata?: any;
    total_logs?: number;
    page?: number;
    size?: number;
    pages?: number;
  }> {
    validatePagination(skip, limit);
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    return this.makeRequest('GET', `/agent/run/${agentRunId}/logs?${params.toString()}`, true);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  async waitForCompletion(
    agentRunId: number,
    pollInterval: number = 5000,
    timeout?: number
  ): Promise<CodegenAgentRunResponse> {
    const startTime = Date.now();
    let pollCount = 0;

    console.log(`[CodegenAPI] Starting to wait for completion of agent run: ${agentRunId}`);

    while (true) {
      pollCount++;
      console.log(`[CodegenAPI] Polling attempt ${pollCount} for agent run: ${agentRunId}`);
      
      const run = await this.getAgentRun(agentRunId);
      console.log(`[CodegenAPI] Agent run ${agentRunId} status: ${run.status}`);

      // Map API status values to our enum values
      const status = run.status?.toLowerCase();
      console.log(`[CodegenAPI] Normalized status: ${status}`);
      
      if (['completed', 'failed', 'cancelled'].includes(status)) {
        console.log(`[CodegenAPI] Agent run ${agentRunId} completed with status: ${status}`);
        return run;
      }

      if (timeout && (Date.now() - startTime) > timeout) {
        console.error(`[CodegenAPI] Agent run ${agentRunId} timed out after ${timeout}ms`);
        throw new Error(`Agent run ${agentRunId} did not complete within ${timeout}ms`);
      }

      console.log(`[CodegenAPI] Waiting ${pollInterval}ms before next poll...`);
      await delay(pollInterval);
    }
  }

  async healthCheck(): Promise<{ status: string; responseTimeMs: number; timestamp: string }> {
    try {
      const startTime = Date.now();
      await this.makeRequest('GET', '/users/me', true);
      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTimeMs: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTimeMs: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  getStats(): {
    config: Partial<ClientConfig>;
    metrics?: Partial<ClientStats>;
    cache?: CacheStats;
    rateLimiter?: RateLimitInfo;
  } {
    const stats: any = {
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        rateLimitRequestsPerPeriod: this.config.rateLimitRequestsPerPeriod,
        cachingEnabled: this.config.enableCaching,
        metricsEnabled: this.config.enableMetrics
      }
    };

    if (this.metrics) {
      const clientStats = this.metrics.getStats();
      stats.metrics = {
        uptimeMs: clientStats.uptimeMs,
        totalRequests: clientStats.totalRequests,
        totalErrors: clientStats.totalErrors,
        errorRate: clientStats.errorRate,
        requestsPerMinute: clientStats.requestsPerMinute,
        averageResponseTime: clientStats.averageResponseTime,
        cacheHitRate: clientStats.cacheHitRate,
        statusCodeDistribution: clientStats.statusCodeDistribution
      };
    }

    if (this.cache) {
      stats.cache = this.cache.getStats();
    }

    stats.rateLimiter = this.rateLimiter.getCurrentUsage();

    return stats;
  }

  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
      console.log('Cache cleared');
    }
  }

  resetMetrics(): void {
    if (this.metrics) {
      this.metrics.reset();
      console.log('Metrics reset');
    }
  }

  // ========================================================================
  // USER ENDPOINTS
  // ========================================================================

  async getUsers(skip: number = 0, limit: number = 100): Promise<UsersResponse> {
    validatePagination(skip, limit);
    
    const response = await this.makeRequest<UsersResponse>(
      'GET',
      `/users?skip=${skip}&limit=${limit}`,
      true
    );
    
    return response;
  }

  async getUser(userId: string): Promise<UserResponse> {
    const response = await this.makeRequest<UserResponse>(
      'GET',
      `/users/${userId}`,
      true
    );
    return response;
  }

  async getCurrentUser(): Promise<UserResponse> {
    const response = await this.makeRequest<UserResponse>(
      'GET',
      '/users/me',
      true
    );
    return response;
  }

  // ========================================================================
  // ORGANIZATION ENDPOINTS
  // ========================================================================

  async getOrganizations(skip: number = 0, limit: number = 100): Promise<OrganizationsResponse> {
    validatePagination(skip, limit);
    
    const response = await this.makeRequest<OrganizationsResponse>(
      'GET',
      `/organizations?skip=${skip}&limit=${limit}`,
      true
    );
    
    return response;
  }

  async getOrganization(): Promise<OrganizationResponse> {
    const response = await this.makeRequest<OrganizationResponse>(
      'GET',
      `/organizations/${this.config.orgId}`,
      true
    );
    return response;
  }

  // ========================================================================
  // BULK OPERATIONS
  // ========================================================================

  async bulkGetUsers(
    userIds: string[],
    progressCallback?: (completed: number, total: number) => void
  ): Promise<BulkOperationResult> {
    if (!this.bulkManager) {
      throw new Error("Bulk operations are disabled");
    }

    return this.bulkManager.executeBulkOperation(
      (userId: string) => this.getUser(userId),
      userIds,
      progressCallback
    );
  }

  async bulkCreateAgentRuns(
    runConfigs: Array<{
      prompt: string;
      images?: string[];
      metadata?: Record<string, any>;
    }>,
    progressCallback?: (completed: number, total: number) => void
  ): Promise<BulkOperationResult> {
    if (!this.bulkManager) {
      throw new Error("Bulk operations are disabled");
    }

    return this.bulkManager.executeBulkOperation(
      (config) => this.createAgentRun(config.prompt, config.images, config.metadata),
      runConfigs,
      progressCallback
    );
  }

  async bulkGetAgentRuns(
    agentRunIds: number[],
    progressCallback?: (completed: number, total: number) => void
  ): Promise<BulkOperationResult> {
    if (!this.bulkManager) {
      throw new Error("Bulk operations are disabled");
    }

    return this.bulkManager.executeBulkOperation(
      (agentRunId: number) => this.getAgentRun(agentRunId),
      agentRunIds,
      progressCallback
    );
  }

  // ========================================================================
  // STREAMING METHODS
  // ========================================================================

  async *streamAllUsers(): AsyncGenerator<UserResponse, void, unknown> {
    let skip = 0;
    while (true) {
      const response = await this.getUsers(skip, 100);
      for (const user of response.items) {
        yield user;
      }
      
      if (response.items.length < 100) {
        break;
      }
      skip += 100;
    }
  }

  async *streamAllAgentRuns(
    userId?: number,
    sourceType?: SourceType
  ): AsyncGenerator<CodegenAgentRunResponse, void, unknown> {
    let skip = 0;
    while (true) {
      const response = await this.listAgentRuns(userId, sourceType, skip, 100);
      for (const run of response.items) {
        yield run;
      }
      
      if (response.items.length < 100) {
        break;
      }
      skip += 100;
    }
  }

  async *streamAllLogs(agentRunId: number): AsyncGenerator<AgentRunLogResponse, void, unknown> {
    let skip = 0;
    while (true) {
      const response = await this.getAgentRunLogs(agentRunId, skip, 100);
      for (const log of response.logs) {
        yield log;
      }
      
      if (response.logs.length < 100) {
        break;
      }
      skip += 100;
    }
  }

  // ========================================================================
  // WEBHOOK HANDLING
  // ========================================================================

  registerWebhookHandler(eventType: string, handler: (payload: Record<string, any>) => void): void {
    if (this.webhookHandler) {
      this.webhookHandler.registerHandler(eventType, handler);
    }
  }

  registerWebhookMiddleware(middleware: (payload: Record<string, any>) => Record<string, any>): void {
    if (this.webhookHandler) {
      this.webhookHandler.registerMiddleware(middleware);
    }
  }

  handleWebhook(payload: Record<string, any>, signature?: string): void {
    if (this.webhookHandler) {
      this.webhookHandler.handleWebhook(payload, signature);
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  async getRunLogs(agentRunId: number): Promise<AgentRunLogResponse[]> {
    const response = await this.getAgentRunLogs(agentRunId, 0, 1000);
    return response.logs;
  }

  async getRunArtifacts(agentRunId: number): Promise<Record<string, any>[]> {
    const response = await this.makeRequest<{ artifacts: Record<string, any>[] }>(
      'GET',
      `/agent/run/${agentRunId}/artifacts`,
      true
    );
    return response.artifacts || [];
  }

  async createErrorFixRun(
    originalRunId: number,
    errorContext: string,
    repoName: string
  ): Promise<CodegenAgentRunResponse> {
    try {
      // Get the original run details
      const originalRun = await this.getAgentRun(originalRunId);
      
      // Create a new run with error context
      const target = `Fix the following error from run ${originalRunId}:\n\n${errorContext}\n\nOriginal target: ${originalRun.result || 'Unknown'}`;
      
      const metadata = {
        parent_run_id: originalRunId,
        run_type: 'error_fix',
        error_context: errorContext,
        repo_name: repoName
      };
      
      console.log(`[CodegenClient] Creating error fix run for run ${originalRunId}`);
      
      return await this.createAgentRun(target, undefined, metadata);
      
    } catch (error) {
      console.error(`[CodegenClient] Failed to create error fix run:`, error);
      throw error;
    }
  }
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

// Create a global client instance for backward compatibility
let globalClient: CodegenClient | null = null;

const getClient = (settings: Pick<GlobalSettings, 'CODEGEN_ORG_ID' | 'CODEGEN_API_TOKEN'>): CodegenClient => {
  console.log(`[CodegenAPI] getClient called with orgId: ${settings.CODEGEN_ORG_ID}, hasToken: ${!!settings.CODEGEN_API_TOKEN}`);
  
  if (!globalClient || 
      (globalClient as any).config?.orgId !== settings.CODEGEN_ORG_ID || 
      (globalClient as any).config?.apiToken !== settings.CODEGEN_API_TOKEN) {
    console.log(`[CodegenAPI] Creating new client instance`);
    globalClient = new CodegenClient({
      apiToken: settings.CODEGEN_API_TOKEN,
      orgId: settings.CODEGEN_ORG_ID,
      logRequests: true, // Enable request logging for debugging
      logResponses: true // Enable response logging for debugging
    });
  }
  return globalClient;
};

export const verifyCodegenToken = async (orgId: string, token: string): Promise<boolean> => {
  try {
    const client = new CodegenClient({ apiToken: token, orgId });
    const health = await client.healthCheck();
    return health.status === 'healthy';
  } catch (error) {
    console.error("Codegen token verification failed:", error);
    return false;
    }
};

const _parseApiResponseToAgentRun = (apiRun: CodegenAgentRunResponse, initialHistory: AgentRun['history']): AgentRun => {
    const history = [...initialHistory];
    let status = AgentRunStatusEnum.RUNNING;

    // Normalize the status to lowercase for comparison
    const normalizedStatus = apiRun.status?.toLowerCase();

    if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') {
        status = AgentRunStatusEnum.ERROR;
        history.push({ 
          type: 'error', 
          content: apiRun.result || 'Agent run failed without a message.', 
          timestamp: new Date().toISOString() 
        });
    } else if (apiRun.github_pull_requests && apiRun.github_pull_requests.length > 0) {
        status = AgentRunStatusEnum.PR_CREATED;
        const pr = apiRun.github_pull_requests[0];
        history.push({ 
          type: 'response', 
          content: `Pull Request #${pr.id} has been created: "${pr.title}".`, 
          timestamp: new Date().toISOString() 
        });
    } else if (normalizedStatus === 'paused') {
        status = AgentRunStatusEnum.RESPONSE_DEFAULT;
        history.push({ 
          type: 'response', 
          content: apiRun.result || 'Agent is paused and awaiting input.', 
          timestamp: new Date().toISOString() 
        });
    } else if (normalizedStatus === 'completed') {
        // When the agent run is completed, set status to IDLE to stop polling
        status = AgentRunStatusEnum.IDLE;
        history.push({ 
          type: 'response', 
          content: apiRun.result || 'Agent run complete.', 
          timestamp: new Date().toISOString() 
        });
    } else if (normalizedStatus === 'active') {
        // ACTIVE status means the agent is running
        status = AgentRunStatusEnum.RUNNING;
        history.push({ 
          type: 'status', 
          content: 'Agent is actively working...', 
          timestamp: new Date().toISOString() 
        });
    }

    return { runId: apiRun.id, status, history };
};

export const pollAgentRunStatus = async (agentRunId: number, settings: GlobalSettings): Promise<AgentRun> => {
  console.log(`[CodegenAPI] Polling status for agent run: ${agentRunId}`);
  
  try {
    const client = getClient(settings);
    const agentRun = await client.getAgentRun(agentRunId);
    
    // Get the latest logs to see the current status
    const logs = await client.getAgentRunLogs(agentRunId, 0, 100);
    
    const history: AgentRun['history'] = [
      { type: 'status', content: `Agent run ID: ${agentRunId}`, timestamp: new Date().toISOString() }
    ];
    
    // Add log entries to history
    if (logs.logs && logs.logs.length > 0) {
      logs.logs.forEach(log => {
        if (log.message_type === 'FINAL_ANSWER' && log.observation) {
          history.push({
            type: 'response',
            content: typeof log.observation === 'string' ? log.observation : JSON.stringify(log.observation),
            timestamp: log.created_at || new Date().toISOString()
          });
        } else if (log.message_type === 'ERROR' && log.observation) {
          history.push({
            type: 'error',
            content: typeof log.observation === 'string' ? log.observation : JSON.stringify(log.observation),
            timestamp: log.created_at || new Date().toISOString()
          });
        } else if (log.thought) {
          history.push({
            type: 'status',
            content: log.thought,
            timestamp: log.created_at || new Date().toISOString()
          });
        }
      });
    }
    
    return _parseApiResponseToAgentRun(agentRun, history);
  } catch (error) {
    console.error(`[CodegenAPI] Failed to poll agent run status:`, error);
    throw error;
  }
};

export const startAgentRun = async (project: Project, target: string, settings: GlobalSettings): Promise<AgentRun> => {
  console.log(`[CodegenAPI] startAgentRun called for project: ${project.full_name}`);
  console.log(`[CodegenAPI] Settings:`, { 
    orgId: settings.CODEGEN_ORG_ID, 
    hasToken: !!settings.CODEGEN_API_TOKEN 
  });
  
    const fullPrompt = `${project.settings.planningStatement}\n\n## Rules:\n${project.settings.rules}\n\n## Target:\n${target}`;
    const initialHistory: AgentRun['history'] = [
      { type: 'prompt' as const, content: `Project: ${project.full_name}\nTarget: ${target}`, timestamp: new Date().toISOString() },
      { type: 'status' as const, content: 'Agent run started...', timestamp: new Date().toISOString() },
    ];

    try {
    console.log(`[CodegenAPI] Getting client...`);
    const client = getClient(settings);
    console.log(`[CodegenAPI] Client obtained, creating agent run...`);
    
    const createResponse = await client.createAgentRun(
      fullPrompt, 
      undefined, 
      { project_name: project.full_name }
    );
    
    initialHistory.push({ 
      type: 'status', 
      content: `Agent run ID: ${createResponse.id}. Waiting for response...`, 
      timestamp: new Date().toISOString() 
    });
    
    const finalRunState = await client.waitForCompletion(createResponse.id);
        return _parseApiResponseToAgentRun(finalRunState, initialHistory);

    } catch(error) {
        console.error("Failed to start agent run:", error);
        const errorMessage = error instanceof CodegenAPIError ? error.message : 'An unknown error occurred.';
        return {
            status: AgentRunStatusEnum.ERROR,
            history: [...initialHistory, { type: 'error', content: errorMessage, timestamp: new Date().toISOString() }]
        };
    }
};

export const continueAgentRun = async (project: Project, message: string, settings: GlobalSettings): Promise<AgentRun> => {
    if (!project.agentRun?.runId) {
        throw new Error("Cannot continue a run without a runId.");
    }
  
    const { runId } = project.agentRun;
    const currentHistory = project.agentRun?.history || [];
  const newHistory: AgentRun['history'] = [
    ...currentHistory, 
    { type: 'prompt', content: message, timestamp: new Date().toISOString() }
  ];

  try {
    const client = getClient(settings);
    
    await client.resumeAgentRun(runId, message);
    newHistory.push({ 
      type: 'status', 
      content: `Resumed run. Waiting for response...`, 
      timestamp: new Date().toISOString() 
    });

    const finalRunState = await client.waitForCompletion(runId);
        return _parseApiResponseToAgentRun(finalRunState, newHistory);

    } catch (error) {
        console.error("Failed to continue agent run:", error);
        const errorMessage = error instanceof CodegenAPIError ? error.message : 'An unknown error occurred.';
        return {
            runId,
            status: AgentRunStatusEnum.ERROR,
            history: [...newHistory, { type: 'error', content: errorMessage, timestamp: new Date().toISOString() }]
        };
    }
};

export const confirmAgentPlan = async (project: Project, settings: GlobalSettings): Promise<AgentRun> => {
    return continueAgentRun(project, 'Proceed with the plan.', settings);
};

export const modifyAgentPlan = async (project: Project, modifiedPlan: string, settings: GlobalSettings): Promise<AgentRun> => {
     return continueAgentRun(project, `User modified the plan. New instructions:\n${modifiedPlan}`, settings);
};

// Export the main client class for advanced usage
export { CodegenClient, SourceType, MessageType, AgentRunStatus };
