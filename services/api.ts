
import { GoogleGenAI } from "@google/genai";
import type { GithubRepo, Project, AgentRun, AgentRunStatus, PullRequest, GlobalSettings, CodegenAgentRunResponse } from '../types';
import { AgentRunStatus as AgentRunStatusEnum, CodegenAPIError } from '../types';

const MOCK_BRANCHES = ['main', 'develop', 'feature/new-ui', 'fix/bug-123'];
const CODEGEN_API_BASE_URL = "https://api.codegen.com/v1";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- Live API/Verification Functions ---

export const verifyGithubToken = async (token: string): Promise<boolean> => {
  if (!token) return false;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error("GitHub token verification failed:", error);
    return false;
  }
};

export const verifyCodegenToken = async (orgId: string, token: string): Promise<boolean> => {
  if (!orgId || !token) return false;
  try {
    const response = await fetch(`${CODEGEN_API_BASE_URL}/organizations/${orgId}/agent/runs?limit=1`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch (error) {
    console.error("Codegen token verification failed:", error);
    return false;
  }
};

export const verifyGeminiApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) {
        console.warn("Gemini API Key is missing for verification.");
        return false;
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({model: 'gemini-2.5-flash', contents: 'test'});
        return true;
    } catch (error) {
        console.error("Gemini API key verification failed:", error);
        return false;
    }
};

export const verifyCloudflareToken = async (apiKey: string, accountId: string): Promise<boolean> => {
    console.log("Verifying Cloudflare token (mocked)...");
    await delay(500);
    return !!apiKey && !!accountId;
};


export const getGithubRepos = async (token: string): Promise<GithubRepo[]> => {
  console.log("API: Fetching all GitHub repos with pagination...");
  if (!token) {
    console.warn("API: GitHub token is missing.");
    return [];
  }

  const cacheKey = 'github-repos-cache';
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log("API: Returning cached GitHub repos.");
      return JSON.parse(cachedData);
    }
  } catch (e) {
    console.error("Could not read from session storage", e);
  }

  const allRepos: GithubRepo[] = [];
  let nextUrl: string | null = 'https://api.github.com/user/repos?sort=updated&per_page=100';

  try {
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status} on URL: ${nextUrl}`);
      }
      
      const data: GithubRepo[] = await response.json();
      allRepos.push(...data);

      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const nextLink = linkHeader.split(',').find(s => s.includes('rel="next"'));
        if (nextLink) {
          const match = nextLink.match(/<([^>]+)>/);
          nextUrl = match ? match[1] : null;
        } else {
          nextUrl = null;
        }
      } else {
        nextUrl = null;
      }
    }

    console.log(`API: Fetched a total of ${allRepos.length} GitHub repos.`);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(allRepos));
    } catch (e) {
      console.error("Could not write to session storage", e);
    }
    return allRepos;
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    sessionStorage.removeItem(cacheKey); // Clear cache on error
    return [];
  }
};


export const getRepoPullRequests = async (fullName: string, token: string): Promise<Omit<PullRequest, 'validationStatus'>[]> => {
    if (!token) {
        console.warn("GitHub token is missing. Cannot fetch pull requests.");
        return [];
    }
    const url = `https://api.github.com/repos/${fullName}/pulls`;
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API responded with ${response.status} for PRs.`);
        }
        const data = await response.json();
        return data.map((pr: any) => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            html_url: pr.html_url,
            user: {
                login: pr.user.login,
            },
        }));
    } catch (error) {
        console.error(`Failed to fetch pull requests for ${fullName}:`, error);
        return [];
    }
};

// --- Mocked Functions for App Flow ---

export const getRepoBranches = async (repoFullName: string): Promise<string[]> => {
  console.log(`API: Fetching branches for ${repoFullName}...`);
  await delay(300);
  console.log(`API: Fetched branches for ${repoFullName}.`);
  return MOCK_BRANCHES;
};

export const setupProjectWebhook = async (
  repoFullName: string,
  githubToken: string,
  workerUrl: string
): Promise<{ success: boolean; message: string }> => {
  console.log(`API: Setting up real webhook for ${repoFullName} to point to ${workerUrl}`);
  // ... (existing implementation is fine)
  if (!githubToken) {
    const message = 'GitHub Token is missing. Cannot set up webhook.';
    console.error(`API: ${message}`);
    return { success: false, message };
  }
  if (!workerUrl) {
    const message = 'Cloudflare Worker URL is missing. Cannot set up webhook.';
    console.error(`API: ${message}`);
    return { success: false, message };
  }

  const apiUrl = `https://api.github.com/repos/${repoFullName}/hooks`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  try {
    const listResponse = await fetch(apiUrl, { headers });

    if (!listResponse.ok) {
      const errorData = await listResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || `Could not list webhooks. GitHub API responded with ${listResponse.status}. Ensure token has 'admin:repo_hook' permissions.`;
      console.error(`API Error: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }

    const existingHooks = await listResponse.json();
    const hookExists = existingHooks.some((hook: any) => hook.config.url === workerUrl);

    if (hookExists) {
      console.log(`API: Webhook for ${repoFullName} pointing to ${workerUrl} already exists.`);
      return { success: true, message: 'Webhook is already active.' };
    }

    console.log(`API: Creating a new webhook for ${repoFullName}.`);
    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['pull_request'],
        config: {
          url: workerUrl,
          content_type: 'json',
        },
      }),
    });

    if (createResponse.status === 201) {
      console.log(`API: Webhook for ${repoFullName} created successfully.`);
      return { success: true, message: 'Webhook set successfully.' };
    } else {
      const errorData = await createResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || `Failed to create webhook. GitHub API responded with ${createResponse.status}.`;
      console.error(`API Error on webhook creation:`, errorData);
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    console.error(`API: An unexpected network error occurred during webhook setup for ${repoFullName}:`, error);
    return { success: false, message: error.message || 'A network error occurred.' };
  }
};

// --- Codegen Agent API Implementation ---

const _codegenApiRequest = async <T,>(
    method: 'GET' | 'POST',
    path: string,
    settings: Pick<GlobalSettings, 'CODEGEN_ORG_ID' | 'CODEGEN_API_TOKEN'>,
    body?: object
): Promise<T> => {
    const url = `${CODEGEN_API_BASE_URL}/organizations/${settings.CODEGEN_ORG_ID}${path}`;
    const headers = {
        'Authorization': `Bearer ${settings.CODEGEN_API_TOKEN}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
            throw new CodegenAPIError(`API request failed with status ${response.status}`, response.status, errorData);
        }
        return response.json() as Promise<T>;
    } catch (error) {
        if (error instanceof CodegenAPIError) throw error;
        console.error('Codegen API request failed:', error);
        throw new CodegenAPIError((error as Error).message || 'An unknown network error occurred.');
    }
};

const _pollAgentRun = async (
    runId: number,
    settings: Pick<GlobalSettings, 'CODEGEN_ORG_ID' | 'CODEGEN_API_TOKEN'>
): Promise<CodegenAgentRunResponse> => {
    while (true) {
        await delay(3000); // Poll every 3 seconds
        const run = await _codegenApiRequest<CodegenAgentRunResponse>(
            'GET', `/agent/run/${runId}`, settings
        );
        if (['completed', 'failed', 'cancelled', 'paused'].includes(run.status)) {
            return run;
        }
    }
};

const _parseApiResponseToAgentRun = (apiRun: CodegenAgentRunResponse, initialHistory: AgentRun['history']): AgentRun => {
    const history = [...initialHistory];
    let status = AgentRunStatusEnum.RUNNING;

    if (apiRun.status === 'failed' || apiRun.status === 'cancelled') {
        status = AgentRunStatusEnum.ERROR;
        history.push({ type: 'error', content: apiRun.result || 'Agent run failed without a message.', timestamp: new Date().toISOString() });
    } else if (apiRun.github_pull_requests && apiRun.github_pull_requests.length > 0) {
        status = AgentRunStatusEnum.PR_CREATED;
        const pr = apiRun.github_pull_requests[0];
        history.push({ type: 'response', content: `Pull Request #${pr.id} has been created: "${pr.title}".`, timestamp: new Date().toISOString() });
    } else if (apiRun.status === 'paused') {
        status = AgentRunStatusEnum.RESPONSE_DEFAULT; // Or PLAN_PROPOSED if we can detect it
        history.push({ type: 'response', content: apiRun.result || 'Agent is paused and awaiting input.', timestamp: new Date().toISOString() });
    } else { // completed
        status = AgentRunStatusEnum.RESPONSE_DEFAULT;
        history.push({ type: 'response', content: apiRun.result || 'Agent run complete.', timestamp: new Date().toISOString() });
    }

    return { runId: apiRun.id, status, history };
};


export const startAgentRun = async (project: Project, target: string, settings: GlobalSettings): Promise<AgentRun> => {
    const fullPrompt = `${project.settings.planningStatement}\n\n## Rules:\n${project.settings.rules}\n\n## Target:\n${target}`;
    const initialHistory: AgentRun['history'] = [
      { type: 'prompt' as const, content: `Project: ${project.full_name}\nTarget: ${target}`, timestamp: new Date().toISOString() },
      { type: 'status' as const, content: 'Agent run started...', timestamp: new Date().toISOString() },
    ];

    try {
        const createResponse = await _codegenApiRequest<CodegenAgentRunResponse>(
            'POST', '/agent/run', settings, { prompt: fullPrompt, metadata: { project_name: project.full_name } }
        );
        initialHistory.push({ type: 'status', content: `Agent run ID: ${createResponse.id}. Waiting for response...`, timestamp: new Date().toISOString() });
        
        const finalRunState = await _pollAgentRun(createResponse.id, settings);
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
    const newHistory: AgentRun['history'] = [...currentHistory, { type: 'prompt', content: message, timestamp: new Date().toISOString() }];

    try {
        await _codegenApiRequest('POST', '/agent/run/resume', settings, { agent_run_id: runId, prompt: message });
        newHistory.push({ type: 'status', content: `Resumed run. Waiting for response...`, timestamp: new Date().toISOString() });

        const finalRunState = await _pollAgentRun(runId, settings);
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

// --- Mocked Functions for remaining actions ---

export const mergePullRequest = async (project: Project, prNumber: number): Promise<{success: boolean}> => {
    console.log(`API: Merging PR #${prNumber} for ${project.full_name}`);
    await delay(700);
    console.log(`API: PR #${prNumber} merged successfully for ${project.full_name}`);
    return { success: true };
};

export const closePullRequest = async (project: Project, prNumber: number): Promise<{success: boolean}> => {
    console.log(`API: Closing PR #${prNumber} for ${project.full_name}`);
    await delay(500);
    console.log(`API: PR #${prNumber} closed for ${project.full_name}`);
    return { success: true };
};

export const getPullRequestDiff = async (project: Project, prNumber: number): Promise<string> => {
    console.log(`API: Fetching diff for PR #${prNumber} in ${project.full_name}`);
    await delay(800);
    return `diff --git a/src/App.tsx b/src/App.tsx
index 6a9b1c6..1b2c3d4 100644
--- a/src/components/ProjectCard.tsx
+++ b/src/components/ProjectCard.tsx
@@ -4,7 +4,7 @@
 import { Card, Button, Spinner, Textarea } from './ui';
 -import { GithubIcon, SettingsIcon, CodeIcon } from './icons';
 +import { GithubIcon, SettingsIcon, CodeIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from './icons';
 import { SettingsModal } from './modals/SettingsModal';
 import { AgentRunModal } from './modals/AgentRunModal';
 -import { startAgentRun, continueAgentRun, confirmAgentPlan } from '../services/api';
 +import { startAgentRun, continueAgentRun, confirmAgentPlan, modifyAgentPlan, mergePullRequest } from '../services/api';
 
 interface ProjectCardProps {
   project: Project;
`;
};
