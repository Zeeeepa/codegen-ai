/**
 * Monitor Selected Button Component
 * Button for monitoring selected agent runs with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { Button, Badge, Popover, PopoverContent, PopoverTrigger } from './ui';
import { 
  MonitorIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  RefreshIcon,
  EyeIcon,
  EyeOffIcon,
  SettingsIcon
} from './icons';
import type { AgentRun } from '../hooks/useCachedAgentRuns';

interface MonitorSelectedButtonProps {
  selectedRuns: string[];
  allRuns: AgentRun[];
  onRunUpdate?: (runId: string, updates: Partial<AgentRun>) => void;
  onClearSelection?: () => void;
  className?: string;
}

interface MonitoringState {
  isMonitoring: boolean;
  updateInterval: number;
  showNotifications: boolean;
  autoRefresh: boolean;
}

const DEFAULT_MONITORING_STATE: MonitoringState = {
  isMonitoring: false,
  updateInterval: 5000, // 5 seconds
  showNotifications: true,
  autoRefresh: true
};

export const MonitorSelectedButton: React.FC<MonitorSelectedButtonProps> = ({
  selectedRuns,
  allRuns,
  onRunUpdate,
  onClearSelection,
  className = ''
}) => {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(DEFAULT_MONITORING_STATE);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Get selected run objects
  const selectedRunObjects = allRuns.filter(run => selectedRuns.includes(run.id));
  
  // Count runs by status
  const statusCounts = selectedRunObjects.reduce((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const runningCount = statusCounts.running || 0;
  const pendingCount = statusCounts.pending || 0;
  const completedCount = statusCounts.completed || 0;
  const failedCount = statusCounts.failed || 0;

  // Start/stop monitoring
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (monitoringState.isMonitoring && monitoringState.autoRefresh && selectedRuns.length > 0) {
      intervalId = setInterval(() => {
        // Mock real-time updates
        selectedRunObjects.forEach(run => {
          if (run.status === 'running') {
            // Simulate progress updates
            const newProgress = Math.min(100, (run.progress?.percentage || 0) + Math.random() * 10);
            onRunUpdate?.(run.id, {
              progress: {
                current: Math.floor(newProgress / 10),
                total: 10,
                percentage: newProgress
              },
              updatedAt: Date.now()
            });

            // Occasionally complete a run
            if (Math.random() < 0.1 && newProgress > 90) {
              onRunUpdate?.(run.id, {
                status: 'completed',
                progress: { current: 10, total: 10, percentage: 100 },
                completedAt: Date.now(),
                duration: Date.now() - run.createdAt,
                updatedAt: Date.now()
              });
            }
          }
        });

        setLastUpdate(Date.now());
      }, monitoringState.updateInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [monitoringState.isMonitoring, monitoringState.autoRefresh, monitoringState.updateInterval, selectedRuns, selectedRunObjects, onRunUpdate]);

  const handleToggleMonitoring = () => {
    setMonitoringState(prev => ({
      ...prev,
      isMonitoring: !prev.isMonitoring
    }));
  };

  const handleBulkAction = async (action: 'pause' | 'resume' | 'cancel') => {
    const targetRuns = selectedRunObjects.filter(run => {
      switch (action) {
        case 'pause':
          return run.status === 'running';
        case 'resume':
          return run.status === 'pending';
        case 'cancel':
          return run.status === 'running' || run.status === 'pending';
        default:
          return false;
      }
    });

    if (targetRuns.length === 0) return;

    try {
      // Mock API calls
      await Promise.all(
        targetRuns.map(async (run) => {
          await new Promise(resolve => setTimeout(resolve, 200));
          
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

          onRunUpdate?.(run.id, {
            status: newStatus,
            updatedAt: Date.now()
          });
        })
      );
    } catch (error) {
      console.error(`Failed to ${action} runs:`, error);
    }
  };

  const handleUpdateInterval = (interval: number) => {
    setMonitoringState(prev => ({
      ...prev,
      updateInterval: interval
    }));
  };

  const formatLastUpdate = () => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (selectedRuns.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Main Monitor Button */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={monitoringState.isMonitoring ? "default" : "outline"}
            size="sm"
            className="relative"
          >
            <MonitorIcon className="w-4 h-4 mr-2" />
            Monitor ({selectedRuns.length})
            {monitoringState.isMonitoring && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4" align="end">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Monitor Agent Runs</h3>
              <Button
                onClick={handleToggleMonitoring}
                variant={monitoringState.isMonitoring ? "default" : "outline"}
                size="sm"
              >
                {monitoringState.isMonitoring ? (
                  <>
                    <EyeOffIcon className="w-4 h-4 mr-1" />
                    Stop
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Start
                  </>
                )}
              </Button>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-blue-700">Running</span>
                <Badge className="bg-blue-100 text-blue-800">{runningCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-yellow-700">Pending</span>
                <Badge className="bg-yellow-100 text-yellow-800">{pendingCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-green-700">Completed</span>
                <Badge className="bg-green-100 text-green-800">{completedCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-red-700">Failed</span>
                <Badge className="bg-red-100 text-red-800">{failedCount}</Badge>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Bulk Actions</h4>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleBulkAction('pause')}
                  variant="outline"
                  size="sm"
                  disabled={runningCount === 0}
                >
                  <PauseIcon className="w-3 h-3 mr-1" />
                  Pause ({runningCount})
                </Button>
                <Button
                  onClick={() => handleBulkAction('resume')}
                  variant="outline"
                  size="sm"
                  disabled={pendingCount === 0}
                >
                  <PlayIcon className="w-3 h-3 mr-1" />
                  Resume ({pendingCount})
                </Button>
                <Button
                  onClick={() => handleBulkAction('cancel')}
                  variant="outline"
                  size="sm"
                  disabled={runningCount + pendingCount === 0}
                >
                  <StopIcon className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Monitoring Settings */}
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700">Settings</h4>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={monitoringState.autoRefresh}
                    onChange={(e) => setMonitoringState(prev => ({
                      ...prev,
                      autoRefresh: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Auto-refresh</span>
                </label>

                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={monitoringState.showNotifications}
                    onChange={(e) => setMonitoringState(prev => ({
                      ...prev,
                      showNotifications: e.target.checked
                    }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span>Show notifications</span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Update interval
                </label>
                <select
                  value={monitoringState.updateInterval}
                  onChange={(e) => handleUpdateInterval(Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1000}>1 second</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                </select>
              </div>
            </div>

            {/* Status Info */}
            {monitoringState.isMonitoring && (
              <div className="text-xs text-gray-500 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span>Last update: {formatLastUpdate()}</span>
                  <RefreshIcon className="w-3 h-3 animate-spin" />
                </div>
              </div>
            )}

            {/* Clear Selection */}
            <div className="border-t pt-3">
              <Button
                onClick={() => {
                  onClearSelection?.();
                  setIsPopoverOpen(false);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MonitorSelectedButton;

