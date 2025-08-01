export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

// Enhanced types for agent run functionality
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  memberCount?: number;
  repositoryCount?: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  features?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  updatedAt: number;
}

export interface PullRequest {
    id: number;
    number: number;
    title: string;
    html_url: string;
    user: {
        login: string;
    };
    validationStatus: 'idle' | 'running' | 'success' | 'failed';
    // Enhanced fields for advanced GitHub integration
    state?: 'open' | 'closed';
    merged_at?: string | null;
    updated_at?: string;
    created_at?: string;
    additions?: number;
    deletions?: number;
    changed_files?: number;
    mergeable?: boolean | null;
    mergeable_state?: string;
    body?: string;
    base?: {
        ref: string;
        sha: string;
    };
    head?: {
        ref: string;
        sha: string;
    };
}

export interface ProjectSettings {
  rules: string;
  planningStatement: string;
  setupCommands: string;
  branch: string;
  secrets: { [key: string]: string };
  autoConfirmPlan: boolean;
  autoMergePR: boolean;
  autoValidatePRs: boolean;
  // Timestamps for when automation settings were enabled (to only apply to new PRs)
  autoConfirmPlanEnabledAt?: string;
  autoMergePREnabledAt?: string;
  autoValidatePRsEnabledAt?: string;
}

export interface GlobalSettings {
  CODEGEN_ORG_ID: string;
  CODEGEN_API_TOKEN: string;
  GITHUB_TOKEN: string;
  GEMINI_API_KEY: string;
  CLOUDFLARE_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_WORKER_NAME: string;
  CLOUDFLARE_WORKER_URL: string;
  [key: string]: string;
}

export interface Project extends GithubRepo {
  settings: ProjectSettings;
  agentRun?: AgentRun;
  pullRequests: PullRequest[];
  webhookStatus: 'setting_up' | 'success' | 'failed';
}

export enum AgentRunStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PLAN_PROPOSED = 'plan_proposed',
  RESPONSE_DEFAULT = 'response_default',
  PR_CREATED = 'pr_created',
  VALIDATING_PR = 'validating_pr',
  ERROR = 'error',
}

export interface AgentRun {
  runId?: number;
  status: AgentRunStatus;
  history: { type: 'prompt' | 'response' | 'plan' | 'error' | 'status'; content: string; timestamp: string }[];
  currentPlan?: {
    title: string;
    steps: string[];
  };
}


// --- Codegen API Response Types ---

export interface CodegenGithubPullRequestResponse {
    id: number;
    title: string;
    url: string;
    created_at: string;
}

export interface CodegenAgentRunResponse {
    id: number;
    organization_id: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
    created_at: string;
    web_url: string;
    result: string | null;
    source_type: string;
    github_pull_requests: CodegenGithubPullRequestResponse[];
    metadata: { [key: string]: any } | null;
}

export class CodegenAPIError extends Error {
    constructor(message: string, public status?: number, public response?: any) {
        super(message);
        this.name = 'CodegenAPIError';
    }
}

// Additional types for enhanced GitHub integration

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubApiResponse<T> {
  data: T;
  headers: Record<string, string>;
}

export interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  committer: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export type PRStatus = 'open' | 'closed' | 'merged';

// CloudflareWebhookEvent interface
export interface CloudflareWebhookEvent {
  action: string;
  pull_request: PullRequest;
  repository: {
    full_name: string;
  };
  timestamp: string;
}

export interface CloudflareConfig {
  workerUrl: string;
  apiToken?: string;
  accountId?: string;
  workerName?: string;
}
