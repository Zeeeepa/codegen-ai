import React, { useState } from 'react';
import { 
  Play, 
  Settings, 
  ExternalLink, 
  Star, 
  GitBranch, 
  AlertCircle,
  Key,
  Terminal,
  FileText,
  CheckSquare,
  Square
} from 'lucide-react';
import { CachedProject } from '../api/types';
import { AgentRunDialog } from './AgentRunDialog';
import { ProjectSettingsDialog } from './ProjectSettingsDialog';
import { PRListModal } from './PRListModal';
import { 
  getProjectSettings, 
  updateProjectSettings, 
  ProjectSettings 
} from '../storage/projectSettings';

interface ProjectCardProps {
  project: CachedProject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: () => void;
}

export function ProjectCard({ project, isSelected, onSelect, onUpdate }: ProjectCardProps) {
  const [showAgentRunDialog, setShowAgentRunDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);

  // Load project settings on mount
  React.useEffect(() => {
    loadProjectSettings();
  }, [project.id]);

  const loadProjectSettings = async () => {
    try {
      const settings = await getProjectSettings(project.id);
      setProjectSettings(settings);
    } catch (error) {
      console.error('Failed to load project settings:', error);
    }
  };

  const handleAutoConfirmToggle = async () => {
    if (!projectSettings) return;
    
    try {
      const updatedSettings = {
        ...projectSettings,
        autoConfirmPlan: !projectSettings.autoConfirmPlan,
      };
      
      await updateProjectSettings(project.id, updatedSettings);
      setProjectSettings(updatedSettings);
      onUpdate();
    } catch (error) {
      console.error('Failed to update auto-confirm setting:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    await loadProjectSettings();
    onUpdate();
  };

  // Determine card border color based on settings
  const getCardBorderColor = () => {
    if (isSelected) return 'border-blue-500';
    if (projectSettings?.repositoryRules) return 'border-yellow-500';
    return 'border-gray-600';
  };

  // Determine if card has custom configuration
  const hasCustomConfig = projectSettings && (
    projectSettings.repositoryRules ||
    projectSettings.setupCommands ||
    (projectSettings.secrets && Object.keys(projectSettings.secrets).length > 0)
  );

  return (
    <>
      <div 
        className={`bg-gray-800 rounded-lg border-2 ${getCardBorderColor()} p-6 hover:bg-gray-750 transition-all duration-200 cursor-pointer relative`}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-white truncate">{project.name}</h3>
              {project.private && (
                <span className="px-2 py-1 text-xs bg-yellow-700 text-yellow-200 rounded">
                  Private
                </span>
              )}
              {hasCustomConfig && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Custom configuration" />
              )}
            </div>
            <p className="text-sm text-gray-400 truncate">{project.fullName}</p>
            {project.description && (
              <p className="text-sm text-gray-300 mt-2 line-clamp-2">{project.description}</p>
            )}
          </div>
          
          {/* PR Count Indicator */}
          {project.prCount !== undefined && project.prCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPRModal(true);
              }}
              className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              title={`${project.prCount} PRs ahead of main`}
            >
              {project.prCount}
            </button>
          )}
        </div>

        {/* Project Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
          {project.language && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{project.language}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3" />
            <span>{project.stargazersCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <GitBranch className="h-3 w-3" />
            <span>{project.forksCount}</span>
          </div>
        </div>

        {/* Auto Confirm Checkbox */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAutoConfirmToggle();
            }}
            className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            {projectSettings?.autoConfirmPlan ? (
              <CheckSquare className="h-4 w-4 text-blue-500" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            <span>Auto Confirm Proposed Plan</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAgentRunDialog(true);
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <Play className="h-4 w-4 mr-2" />
            Agent Run
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsDialog(true);
            }}
            className="inline-flex items-center justify-center p-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title="Project Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          
          <a
            href={project.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center p-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            title="Open in GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Last Updated */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Updated {new Date(project.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Dialogs */}
      <AgentRunDialog
        isOpen={showAgentRunDialog}
        onClose={() => setShowAgentRunDialog(false)}
        project={project}
        autoConfirm={projectSettings?.autoConfirmPlan || false}
      />

      <ProjectSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        project={project}
        onUpdate={handleSettingsUpdate}
      />

      <PRListModal
        isOpen={showPRModal}
        onClose={() => setShowPRModal(false)}
        project={project}
      />
    </>
  );
}
