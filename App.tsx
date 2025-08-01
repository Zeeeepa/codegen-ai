
import React, { useState, useEffect } from 'react';
import type { GithubRepo, Project, GlobalSettings, PullRequest } from './types';
import { AgentRunStatus } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/Header';
import { ProjectCard } from './components/ProjectCard';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { setupProjectWebhook, getRepoPullRequests } from './services/github_service';
import { runValidationPipeline } from './services/grainchain_library';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
    CODEGEN_ORG_ID: '323',
    CODEGEN_API_TOKEN: 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99',
    GITHUB_TOKEN: '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',
    GEMINI_API_KEY: 'AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0',
    CLOUDFLARE_API_KEY: 'eae82cf159577a8838cc83612104c09c5a0d6',
    CLOUDFLARE_ACCOUNT_ID: '2b2a1d3effa7f7fe4fe2a8c4e48681e3',
    CLOUDFLARE_WORKER_NAME: 'webhook-gateway',
    CLOUDFLARE_WORKER_URL: 'https://webhook-gateway.pixeliumperfecto.workers.dev',
};


const App: React.FC = () => {
  const [projects, setProjects] = useLocalStorage<Project[]>('dashboard-projects', []);
  const [globalSettings, setGlobalSettings] = useLocalStorage<GlobalSettings>('global-settings', DEFAULT_GLOBAL_SETTINGS);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  // Effect for polling PRs
  useEffect(() => {
    if (!globalSettings.GITHUB_TOKEN || projects.length === 0) {
      return;
    }

    const poll = async () => {
      let hasChanges = false;
      const newProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const fetchedPRsData = await getRepoPullRequests(project.full_name, globalSettings.GITHUB_TOKEN);
            const currentPRIds = new Set(project.pullRequests.map(pr => pr.id));
            const fetchedPRIds = new Set(fetchedPRsData.map(pr => pr.id));
            
            if (currentPRIds.size === fetchedPRIds.size && [...currentPRIds].every(id => fetchedPRIds.has(id))) {
              return project;
            }

            hasChanges = true;
            const updatedPRs: PullRequest[] = fetchedPRsData.map(prData => {
                const existingPR = project.pullRequests.find(p => p.id === prData.id);
                return existingPR ? existingPR : { ...prData, validationStatus: 'idle' };
            });

            return { ...project, pullRequests: updatedPRs };
          } catch (error) {
            console.error(`Failed to poll PRs for ${project.full_name}:`, error);
            return project; // Return original project on error to prevent data loss
          }
        })
      );

      if (hasChanges) {
        setProjects(newProjects);
      }
    };

    const intervalId = setInterval(poll, 15000); // Poll every 15 seconds
    return () => clearInterval(intervalId);
  }, [projects, globalSettings.GITHUB_TOKEN, setProjects]);

  // Effect for handling auto-validation
  useEffect(() => {
    const validationsToStart: { projectId: number, prId: number }[] = [];
    
    projects.forEach(project => {
      if (project.settings.autoValidatePRs && project.settings.autoValidatePRsEnabledAt) {
        const enabledAt = new Date(project.settings.autoValidatePRsEnabledAt);
        
        project.pullRequests.forEach(pr => {
          // Only validate PRs that were created AFTER the setting was enabled
          if (pr.validationStatus === 'idle' && pr.created_at) {
            const prCreatedAt = new Date(pr.created_at);
            if (prCreatedAt > enabledAt) {
              validationsToStart.push({ projectId: project.id, prId: pr.id });
            }
          }
        });
      }
    });

    if (validationsToStart.length > 0) {
      setProjects(currentProjects => {
        return currentProjects.map(p => {
          const updatesForProject = validationsToStart.filter(v => v.projectId === p.id);
          if (updatesForProject.length === 0) return p;
          
          const prIdToUpdate = new Set(updatesForProject.map(v => v.prId));
          return {
            ...p,
            pullRequests: p.pullRequests.map(pr => 
              prIdToUpdate.has(pr.id) ? { ...pr, validationStatus: 'running' } : pr
            ),
            agentRun: {
                ...p.agentRun!,
                status: AgentRunStatus.VALIDATING_PR,
                history: [
                    ...p.agentRun!.history,
                    { type: 'status', content: `Auto-validation started for ${updatesForProject.length} PR(s).`, timestamp: new Date().toISOString() }
                ]
            }
          };
        });
      });
    }
  }, [projects, setProjects]);


  // Effect for running the validation pipeline
  useEffect(() => {
    const projectToValidate = projects.find(p => p.agentRun?.status === AgentRunStatus.VALIDATING_PR);
    if (!projectToValidate) return;
    
    // Find the first PR that is 'running' but not yet finished.
    const prToValidate = projectToValidate.pullRequests.find(pr => pr.validationStatus === 'running');
    if (!prToValidate) return;

    // A flag to prevent multiple invocations for the same validation run
    const history = projectToValidate.agentRun!.history;
    const lastLog = history[history.length - 1];
    if ((lastLog?.content || '').includes('Validation pipeline complete.')) return;

    const runValidation = async () => {
        const logCallback = (log: string) => {
            setProjects(currentProjects => currentProjects.map(p => {
                if (p.id !== projectToValidate.id) return p;
                return {
                    ...p,
                    agentRun: {
                        ...p.agentRun!,
                        history: [...p.agentRun!.history, { type: 'status', content: log, timestamp: new Date().toISOString() }]
                    }
                }
            }));
        };

        const result = await runValidationPipeline(
            projectToValidate.full_name,
            prToValidate.number,
            globalSettings.GEMINI_API_KEY,
            logCallback
        );

        // Update final status
        setProjects(currentProjects => currentProjects.map(p => {
            if (p.id !== projectToValidate.id) return p;
            return {
                ...p,
                pullRequests: p.pullRequests.map(pull => 
                    pull.id === prToValidate.id ? { ...pull, validationStatus: result.success ? 'success' : 'failed' } : pull
                ),
                agentRun: {
                    ...p.agentRun!,
                    status: AgentRunStatus.IDLE,
                    history: [...p.agentRun!.history, { type: result.success ? 'status' : 'error', content: result.finalReport, timestamp: new Date().toISOString() }]
                }
            }
        }));
    };

    runValidation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, globalSettings.GEMINI_API_KEY]);

  const addProject = async (repo: GithubRepo) => {
    if (projects.find(p => p.id === repo.id)) {
      alert('Project already on the dashboard.');
      return;
    }
    
    const prData = await getRepoPullRequests(repo.full_name, globalSettings.GITHUB_TOKEN);
    const pullRequests: PullRequest[] = prData.map(pr => ({
        ...pr,
        validationStatus: 'idle',
    }));

    const newProject: Project = {
      ...repo,
      pullRequests,
      webhookStatus: 'setting_up',
      settings: {
        rules: '',
        planningStatement: 'You are an expert software engineer. Analyze the following request and create a robust, maintainable solution.',
        setupCommands: 'npm install\nnpm run start',
        branch: 'main',
        secrets: {},
        autoConfirmPlan: false,
        autoMergePR: false,
        autoValidatePRs: false,
      },
      agentRun: {
        status: AgentRunStatus.IDLE,
        history: [],
      }
    };

    setProjects(prev => [newProject, ...prev]);

    const result = await setupProjectWebhook(
      repo.full_name,
      globalSettings.GITHUB_TOKEN,
      globalSettings.CLOUDFLARE_WORKER_URL
    );

    setProjects(prev => prev.map(p => 
      p.id === repo.id ? { ...p, webhookStatus: result.success ? 'success' : 'failed' } : p
    ));
  };

  const handleRetryWebhookSetup = async (projectId: number) => {
    const projectToRetry = projects.find(p => p.id === projectId);
    if (!projectToRetry) return;

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, webhookStatus: 'setting_up' } : p
    ));

    const result = await setupProjectWebhook(
      projectToRetry.full_name,
      globalSettings.GITHUB_TOKEN,
      globalSettings.CLOUDFLARE_WORKER_URL
    );

    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, webhookStatus: result.success ? 'success' : 'failed' } : p
    ));
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
  };

  const removeProject = (projectId: number) => {
    if (window.confirm('Are you sure you want to remove this project from the dashboard?')) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <Header
        onAddProject={addProject}
        onOpenSettings={() => setIsGlobalSettingsOpen(true)}
        githubToken={globalSettings.GITHUB_TOKEN}
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                globalSettings={globalSettings}
                onUpdate={updateProject}
                onRemove={removeProject}
                onRetryWebhookSetup={handleRetryWebhookSetup}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-gray-400">Your Dashboard is Empty</h2>
            <p className="mt-2 text-gray-500">Use the dropdown in the header to add a GitHub project.</p>
          </div>
        )}
      </main>
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        settings={globalSettings}
        onSave={(newSettings) => {
            // If the github token changed, clear the session cache
            if (newSettings.GITHUB_TOKEN !== globalSettings.GITHUB_TOKEN) {
                sessionStorage.removeItem('github-repos-cache');
            }
            setGlobalSettings(newSettings);
        }}
      />
    </div>
  );
};

export default App;
