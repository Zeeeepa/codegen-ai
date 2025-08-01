import React, { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectSettings, AgentRun, GlobalSettings } from '../types';
import { AgentRunStatus } from '../types';
import { Card, Button, Spinner, Textarea } from './ui';
import { GithubIcon, SettingsIcon, CodeIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ZapIcon, BellIcon, BellAlertIcon, DocumentTextIcon, PlusIcon } from './icons';
import { SettingsModal } from './modals/SettingsModal';
import { AgentRunModal } from './modals/AgentRunModal';
import { PullRequestModal } from './modals/PullRequestModal';
import { MarkdownViewerModal } from './modals/MarkdownViewerModal';
import { startAgentRun, continueAgentRun, confirmAgentPlan, modifyAgentPlan, pollAgentRunStatus } from '../services/codegen_library';

interface ProjectCardProps {
  project: Project;
  globalSettings: GlobalSettings;
  onUpdate: (updatedProject: Project | ((p: Project) => Project)) => void;
  onRemove: (projectId: number) => void;
  onRetryWebhookSetup: (projectId: number) => void;
}

const getStatusInfo = (status: AgentRunStatus): { color: string; Icon: React.FC<{className?:string}>; text: string } => {
    switch(status) {
        case AgentRunStatus.IDLE: return { color: 'text-gray-400', Icon: InformationCircleIcon, text: 'Idle' };
        case AgentRunStatus.RUNNING: return { color: 'text-blue-400', Icon: Spinner, text: 'Running' };
        case AgentRunStatus.PLAN_PROPOSED: return { color: 'text-yellow-400', Icon: InformationCircleIcon, text: 'Plan Proposed' };
        case AgentRunStatus.RESPONSE_DEFAULT: return { color: 'text-purple-400', Icon: InformationCircleIcon, text: 'Awaiting Input' };
        case AgentRunStatus.PR_CREATED: return { color: 'text-green-400', Icon: CheckCircleIcon, text: 'Agent Run Complete' };
        case AgentRunStatus.VALIDATING_PR: return { color: 'text-indigo-400', Icon: Spinner, text: 'Validating PR' };
        case AgentRunStatus.ERROR: return { color: 'text-red-400', Icon: ExclamationTriangleIcon, text: 'Error' };
        default: return { color: 'text-gray-500', Icon: InformationCircleIcon, text: 'Unknown' };
    }
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, globalSettings, onUpdate, onRemove, onRetryWebhookSetup }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAgentRunOpen, setIsAgentRunOpen] = useState(false);
  const [isPullRequestModalOpen, setIsPullRequestModalOpen] = useState(false);
  const [isReadmeModalOpen, setIsReadmeModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [continueText, setContinueText] = useState('');
  const [isModifyingPlan, setIsModifyingPlan] = useState(false);
  const [modifiedPlanText, setModifiedPlanText] = useState('');
  const [readmeExists, setReadmeExists] = useState<boolean | null>(null);
  const [planExists, setPlanExists] = useState<boolean | null>(null);

  // Extract project name from full_name (e.g., "Zeeeeepa/codegenApp" -> "codegenApp")
  const getProjectName = (fullName: string): string => {
    const parts = fullName.split('/');
    return parts[parts.length - 1] || fullName;
  };

  const updateAgentRun = (newRunState: AgentRun) => {
    onUpdate({ ...project, agentRun: newRunState });
  };
  
  const handleConfirmPlan = useCallback(async () => {
    updateAgentRun({ ...project.agentRun!, status: AgentRunStatus.RUNNING });
    const result = await confirmAgentPlan(project, globalSettings);
    updateAgentRun(result);
  }, [project, globalSettings]);

  useEffect(() => {
    // Auto-confirm plan if the setting is enabled and was enabled before the current agent run
    if (project.settings.autoConfirmPlan && 
        project.settings.autoConfirmPlanEnabledAt && 
        project.agentRun?.status === AgentRunStatus.PLAN_PROPOSED && 
        !isModifyingPlan) {
        
        // Check if the setting was enabled before the current agent run started
        const settingEnabledAt = new Date(project.settings.autoConfirmPlanEnabledAt);
        const agentRunStartedAt = project.agentRun.history.length > 0 
          ? new Date(project.agentRun.history[0].timestamp)
          : new Date();
        
        if (settingEnabledAt <= agentRunStartedAt) {
            handleConfirmPlan();
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.agentRun?.status, project.settings.autoConfirmPlan, isModifyingPlan]);

  // Poll for agent run status updates when agent is running
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (project.agentRun?.status === AgentRunStatus.RUNNING && project.agentRun.runId) {
      console.log(`[ProjectCard] Starting polling for agent run ${project.agentRun.runId}`);
      
      const pollStatus = async () => {
        try {
          const updatedRun = await pollAgentRunStatus(project.agentRun!.runId!, globalSettings);
          console.log(`[ProjectCard] Polled status for run ${project.agentRun!.runId}:`, updatedRun.status);
          console.log(`[ProjectCard] Current status: ${project.agentRun?.status}, New status: ${updatedRun.status}`);
          
          // Only update if the status has changed
          if (updatedRun.status !== project.agentRun?.status) {
            console.log(`[ProjectCard] Status changed from ${project.agentRun?.status} to ${updatedRun.status}`);
            updateAgentRun(updatedRun);
          } else {
            console.log(`[ProjectCard] Status unchanged: ${updatedRun.status}`);
          }
        } catch (error) {
          console.error(`[ProjectCard] Error polling agent run status:`, error);
        }
      };
      
      // Poll immediately, then every 5 seconds
      pollStatus();
      pollInterval = setInterval(pollStatus, 5000);
    } else {
      console.log(`[ProjectCard] Not polling - status: ${project.agentRun?.status}, runId: ${project.agentRun?.runId}`);
    }
    
    return () => {
      if (pollInterval) {
        console.log(`[ProjectCard] Stopping polling for agent run`);
        clearInterval(pollInterval);
      }
    };
  }, [project.agentRun?.status, project.agentRun?.runId, globalSettings]);


  const handleSaveSettings = (settings: ProjectSettings) => {
    onUpdate({ ...project, settings });
  };

  const handleStartRun = async (target: string) => {
    updateAgentRun({ status: AgentRunStatus.RUNNING, history: [], runId: undefined });
    const result = await startAgentRun(project, target, globalSettings);
    updateAgentRun(result);
  };
  
  const handleContinueRun = async () => {
    if (!continueText.trim() || !project.agentRun) return;
    const runState = project.agentRun;
    updateAgentRun({ ...runState, status: AgentRunStatus.RUNNING });
    const result = await continueAgentRun(project, continueText, globalSettings);
    updateAgentRun(result);
    setContinueText('');
  };
  
  const handleModifyClick = () => {
    const planText = project.agentRun?.currentPlan?.steps.join('\n') || '';
    setModifiedPlanText(planText);
    setIsModifyingPlan(true);
  };

  const handleCancelModify = () => {
      setIsModifyingPlan(false);
      setModifiedPlanText('');
  };

  const handleConfirmModification = async () => {
      if (!modifiedPlanText.trim() || !project.agentRun) return;
      const runState = project.agentRun;
      updateAgentRun({ ...runState, status: AgentRunStatus.RUNNING });
      const result = await modifyAgentPlan(project, modifiedPlanText, globalSettings);
      updateAgentRun(result);
      setIsModifyingPlan(false);
      setModifiedPlanText('');
  };

  const checkFileExists = async (fileName: string): Promise<boolean> => {
    if (!globalSettings.GITHUB_TOKEN) return false;
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${project.full_name}/contents/${fileName}`,
        {
          headers: {
            Authorization: `Bearer ${globalSettings.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to check if ${fileName} exists:`, error);
      return false;
    }
  };

  const updateFileExistence = async () => {
    const [readme, plan] = await Promise.all([
      checkFileExists('README.md'),
      checkFileExists('PLAN.md')
    ]);
    setReadmeExists(readme);
    setPlanExists(plan);
  };

  useEffect(() => {
    updateFileExistence();
  }, [project.full_name, globalSettings.GITHUB_TOKEN]);

  const renderWebhookStatus = () => {
    switch (project.webhookStatus) {
      case 'setting_up':
        return <span title="Setting up webhook..."><Spinner className="w-5 h-5 text-blue-400" /></span>;
      case 'success':
        return <span title="Webhook is active"><BellIcon className="w-5 h-5 text-green-400" /></span>;
      case 'failed':
        return (
          <button onClick={() => onRetryWebhookSetup(project.id)} title="Webhook setup failed. Click to retry.">
            <BellAlertIcon className="w-5 h-5 text-red-400 hover:text-red-300 transition-colors" />
          </button>
        );
      default:
        return null; // Don't show anything if status is not available or for old projects
    }
  };

  const agentRun = project.agentRun || { status: AgentRunStatus.IDLE, history: [] };
  const { color, Icon, text } = getStatusInfo(agentRun.status);
  const hasRules = project.settings.rules.trim().length > 0;
  const isAgentBusy = agentRun.status === AgentRunStatus.RUNNING || agentRun.status === AgentRunStatus.VALIDATING_PR;

  return (
    <>
      <Card className="flex flex-col h-full border-2 border-transparent transition-all" style={{borderColor: hasRules ? '#818cf8' : 'transparent'}}>
        <div className="flex-shrink-0 p-4 bg-gray-900/50 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            <GithubIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
            <a href={`https://github.com/${project.full_name}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-lg text-white hover:text-indigo-400 truncate">
              {getProjectName(project.full_name)}
            </a>
          </div>
          <div className="flex items-center gap-2">
            {renderWebhookStatus()}
            {project.settings.autoValidatePRs && (
                <div title="Auto-validation enabled for new PRs">
                    <ZapIcon className="w-5 h-5 text-yellow-400" />
                </div>
            )}
            <Button 
              variant="ghost" 
              className="p-2" 
              onClick={() => setIsReadmeModalOpen(true)}
              title={readmeExists ? "View README.md" : "Create README.md"}
            >
              {readmeExists ? (
                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
              ) : (
                <PlusIcon className="w-5 h-5 text-blue-400" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              className="p-2" 
              onClick={() => setIsPlanModalOpen(true)}
              title={planExists ? "View PLAN.md" : "Create PLAN.md"}
            >
              {planExists ? (
                <DocumentTextIcon className="w-5 h-5 text-green-400" />
              ) : (
                <PlusIcon className="w-5 h-5 text-green-400" />
              )}
            </Button>
            {project.pullRequests.length > 0 && (
                 <button onClick={() => setIsPullRequestModalOpen(true)} className="relative flex items-center justify-center h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" title="Manage Pull Requests">
                    <GithubIcon className="w-5 h-5 text-white"/>
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                        {project.pullRequests.length}
                    </span>
                </button>
            )}
            <Button variant="ghost" className="p-2" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-grow p-4 flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${isAgentBusy ? 'animate-spin' : ''} ${color}`} />
            <span className={`font-medium text-sm ${color}`}>{text}</span>
          </div>

          <div className="flex-grow bg-black/30 rounded-md p-3 text-sm font-mono text-gray-300 overflow-y-auto h-48 min-h-[12rem]">
            {agentRun.history.length > 0 ? (
                agentRun.history.map((entry, index) => (
                    <div key={index} className="whitespace-pre-wrap leading-relaxed">
                        <span className="text-gray-500 mr-2">{`[${new Date(entry.timestamp).toLocaleTimeString()}]`}</span>
                        <span className={entry.type === 'error' ? 'text-red-400' : entry.type === 'prompt' ? 'text-cyan-400' : 'text-gray-300'}>
                            {entry.content}
                        </span>
                    </div>
                ))
            ) : <span className="text-gray-500">Agent log is empty. Click "Run Agent" to start.</span> }
          </div>

          {agentRun.status === AgentRunStatus.PLAN_PROPOSED && agentRun.currentPlan && (
            <Card className="bg-gray-900/70 p-3">
                {!isModifyingPlan ? (
                    <>
                        <h4 className="font-bold text-yellow-300">{agentRun.currentPlan.title}</h4>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-300">
                            {agentRun.currentPlan.steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                        <div className="flex justify-end gap-2 mt-3">
                            <Button variant="secondary" size="sm" onClick={handleModifyClick}>Modify</Button>
                            <Button variant="primary" size="sm" onClick={handleConfirmPlan}>Confirm</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-2">
                        <h4 className="font-bold text-yellow-300">Modify Plan</h4>
                        <Textarea 
                            value={modifiedPlanText}
                            onChange={e => setModifiedPlanText(e.target.value)}
                            rows={6}
                            className="text-sm"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="secondary" size="sm" onClick={handleCancelModify}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={handleConfirmModification}>Confirm Changes</Button>
                        </div>
                    </div>
                )}
            </Card>
          )}

          {agentRun.status === AgentRunStatus.RESPONSE_DEFAULT && (
            <div className="flex flex-col gap-2">
                <Textarea value={continueText} onChange={e => setContinueText(e.target.value)} placeholder="Add text and press 'Continue'..." rows={2} />
                <Button onClick={handleContinueRun} disabled={!continueText.trim()} className="self-end">Continue</Button>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-4 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center">
            <Button variant="danger" size="sm" onClick={() => onRemove(project.id)}>Remove Project</Button>
            <Button onClick={() => setIsAgentRunOpen(true)} disabled={isAgentBusy}>
                <CodeIcon className="w-5 h-5 mr-2" />
                Run Agent
            </Button>
        </div>
      </Card>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={project}
        onSave={handleSaveSettings}
      />
      
      <AgentRunModal
        isOpen={isAgentRunOpen}
        onClose={() => setIsAgentRunOpen(false)}
        project={project}
        onConfirm={handleStartRun}
      />

      <PullRequestModal
        isOpen={isPullRequestModalOpen}
        onClose={() => setIsPullRequestModalOpen(false)}
        project={project}
        globalSettings={globalSettings}
        onUpdateProject={onUpdate}
      />

      <MarkdownViewerModal
        isOpen={isReadmeModalOpen}
        onClose={() => {
          setIsReadmeModalOpen(false);
          updateFileExistence();
        }}
        project={project}
        globalSettings={globalSettings}
        fileName="README.md"
        onUpdateProject={onUpdate}
      />

      <MarkdownViewerModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          updateFileExistence();
        }}
        project={project}
        globalSettings={globalSettings}
        fileName="PLAN.md"
        onUpdateProject={onUpdate}
      />
    </>
  );
};