/**
 * Agent Run Dialog Component
 * Modal dialog for viewing and managing individual agent runs
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, LoadingSpinner } from './ui';
import { 
  XIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  RefreshIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
  GitBranchIcon,
  SettingsIcon
} from './icons';
import type { AgentRun, AgentStep, AgentLog } from '../hooks/useCachedAgentRuns';

interface AgentRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentRun: AgentRun;
  onAgentRunUpdate?: (agentRun: AgentRun) => void;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_ICONS = {
  pending: ClockIcon,
  running: PlayIcon,
  completed: CheckCircleIcon,
  failed: XCircleIcon,
  cancelled: StopIcon
};

const STEP_STATUS_COLORS = {
  pending: 'text-gray-400',
  running: 'text-blue-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  skipped: 'text-gray-400'
};

export const AgentRunDialog: React.FC<AgentRunDialogProps> = ({
  isOpen,
  onClose,
  agentRun,
  onAgentRunUpdate
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);

  const StatusIcon = STATUS_ICONS[agentRun.status];

  // Load detailed data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAgentRunDetails();
    }
  }, [isOpen, agentRun.id]);

  const loadAgentRunDetails = async () => {
    setIsLoading(true);
    try {
      // Mock API calls - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock steps
      const mockSteps: AgentStep[] = [
        {
          id: 'step-1',
          name: 'Analyze codebase',
          status: 'completed',
          startedAt: Date.now() - 120000,
          completedAt: Date.now() - 90000,
          duration: 30000,
          output: 'Successfully analyzed 45 files and identified key components'
        },
        {
          id: 'step-2',
          name: 'Generate implementation plan',
          status: 'completed',
          startedAt: Date.now() - 90000,
          completedAt: Date.now() - 60000,
          duration: 30000,
          output: 'Created detailed plan with 5 implementation steps'
        },
        {
          id: 'step-3',
          name: 'Implement changes',
          status: agentRun.status === 'running' ? 'running' : agentRun.status === 'completed' ? 'completed' : 'pending',
          startedAt: agentRun.status !== 'pending' ? Date.now() - 60000 : undefined,
          completedAt: agentRun.status === 'completed' ? Date.now() - 30000 : undefined,
          duration: agentRun.status === 'completed' ? 30000 : undefined,
          output: agentRun.status === 'completed' ? 'Successfully implemented all required changes' : undefined
        },
        {
          id: 'step-4',
          name: 'Run tests',
          status: agentRun.status === 'completed' ? 'completed' : 'pending',
          startedAt: agentRun.status === 'completed' ? Date.now() - 30000 : undefined,
          completedAt: agentRun.status === 'completed' ? Date.now() - 15000 : undefined,
          duration: agentRun.status === 'completed' ? 15000 : undefined,
          output: agentRun.status === 'completed' ? 'All tests passed successfully' : undefined
        },
        {
          id: 'step-5',
          name: 'Create pull request',
          status: agentRun.status === 'completed' ? 'completed' : 'pending',
          startedAt: agentRun.status === 'completed' ? Date.now() - 15000 : undefined,
          completedAt: agentRun.status === 'completed' ? Date.now() : undefined,
          duration: agentRun.status === 'completed' ? 15000 : undefined,
          output: agentRun.status === 'completed' ? 'Pull request created: #123' : undefined
        }
      ];

      // Mock logs
      const mockLogs: AgentLog[] = [
        {
          id: 'log-1',
          timestamp: Date.now() - 120000,
          level: 'info',
          message: 'Starting agent run execution',
          data: { runId: agentRun.id }
        },
        {
          id: 'log-2',
          timestamp: Date.now() - 115000,
          level: 'info',
          message: 'Analyzing repository structure',
          data: { fileCount: 45 }
        },
        {
          id: 'log-3',
          timestamp: Date.now() - 110000,
          level: 'debug',
          message: 'Found TypeScript configuration',
          data: { configFile: 'tsconfig.json' }
        },
        {
          id: 'log-4',
          timestamp: Date.now() - 105000,
          level: 'info',
          message: 'Identified key components for modification',
          data: { components: ['App.tsx', 'components/ui.tsx'] }
        },
        {
          id: 'log-5',
          timestamp: Date.now() - 90000,
          level: 'info',
          message: 'Generated implementation plan',
          data: { stepCount: 5 }
        }
      ];

      setSteps(mockSteps);
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to load agent run details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let newStatus: AgentRun['status'];
      switch (action) {
        case 'pause':
          newStatus = 'pending';
          break;
        case 'resume':
          newStatus = 'running';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        default:
          return;
      }

      const updatedRun = { ...agentRun, status: newStatus, updatedAt: Date.now() };
      onAgentRunUpdate?.(updatedRun);
    } catch (error) {
      console.error(`Failed to ${action} agent run:`, error);
    }
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return 'N/A';
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogLevelColor = (level: AgentLog['level']): string => {
    const colors = {
      debug: 'text-gray-500',
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    };
    return colors[level];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <StatusIcon className="w-6 h-6 text-gray-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Run Details</h2>
            <p className="text-sm text-gray-500">ID: {agentRun.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {agentRun.status === 'running' && (
            <>
              <Button onClick={() => handleAction('pause')} variant="outline" size="sm">
                <PauseIcon className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={() => handleAction('cancel')} variant="outline" size="sm">
                <StopIcon className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
          {agentRun.status === 'pending' && (
            <Button onClick={() => handleAction('resume')} variant="outline" size="sm">
              <PlayIcon className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Button onClick={loadAgentRunDetails} variant="outline" size="sm">
            <RefreshIcon className="w-4 h-4" />
          </Button>
          <Button onClick={onClose} variant="ghost" size="sm">
            <XIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="px-6 pt-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="p-6 space-y-6">
              {/* Status and Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge className={STATUS_COLORS[agentRun.status]}>
                    {agentRun.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Duration</label>
                  <p className="text-sm text-gray-900">{formatDuration(agentRun.duration)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Progress</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agentRun.progress?.percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {agentRun.progress?.percentage || 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Target and Description */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Target</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {agentRun.target}
                  </p>
                </div>
                {agentRun.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {agentRun.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{formatTimestamp(agentRun.createdAt)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatTimestamp(agentRun.updatedAt)}</p>
                </div>
              </div>

              {/* Tags */}
              {agentRun.tags && agentRun.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {agentRun.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="steps" className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                            step.status === 'completed' ? 'border-green-500 bg-green-50 text-green-700' :
                            step.status === 'running' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                            step.status === 'failed' ? 'border-red-500 bg-red-50 text-red-700' :
                            'border-gray-300 bg-gray-50 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          <h3 className="font-medium text-gray-900">{step.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${STATUS_COLORS[step.status]} text-xs`}>
                            {step.status}
                          </Badge>
                          {step.duration && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(step.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {step.output && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                          {step.output}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-700">
                          <strong>Error:</strong> {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start space-x-3 py-1">
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs font-medium uppercase ${getLogLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-gray-900 flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="artifacts" className="p-6">
              <div className="text-center py-8 text-gray-500">
                <FileTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No artifacts available yet</p>
                <p className="text-sm mt-1">Artifacts will appear here when the agent run completes</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Modal>
  );
};

export default AgentRunDialog;

