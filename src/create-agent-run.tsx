/**
 * Agent run creation component
 * Provides interface for creating and configuring new agent runs
 */

import React, { useState, useEffect } from 'react';
import { credentials } from './utils/credentials';
import { userProfile } from './utils/userProfile';
import { toast } from './utils/toast';
import { notifications } from './utils/notifications';
import { Card, Button, Input, Textarea, Select, Badge, LoadingSpinner } from './components/ui';
import { PlayIcon, SettingsIcon, TagIcon, ClockIcon, TargetIcon } from './components/icons';
import type { AgentRun } from './hooks/useCachedAgentRuns';

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

export interface AgentRunTemplate {
  id: string;
  name: string;
  description: string;
  target: string;
  tags: string[];
  estimatedDuration?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CreateAgentRunState {
  loading: boolean;
  submitting: boolean;
  error?: string;
  repositories: Repository[];
  templates: AgentRunTemplate[];
}

interface CreateAgentRunForm {
  organizationId: string;
  repositoryId?: string;
  target: string;
  description: string;
  tags: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  autoConfirmPlan: boolean;
  autoMergePR: boolean;
  templateId?: string;
}

interface CreateAgentRunProps {
  organizationId: string;
  onAgentRunCreated?: (agentRun: AgentRun) => void;
  onCancel?: () => void;
  initialValues?: Partial<CreateAgentRunForm>;
  showRepositorySelector?: boolean;
}

const DEFAULT_FORM_VALUES: CreateAgentRunForm = {
  organizationId: '',
  target: '',
  description: '',
  tags: [],
  priority: 'normal',
  autoConfirmPlan: false,
  autoMergePR: false
};

const AGENT_RUN_TEMPLATES: AgentRunTemplate[] = [
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Fix a specific bug or issue in the codebase',
    target: 'Fix the bug described in issue #{{issue_number}}',
    tags: ['bug', 'fix'],
    estimatedDuration: 30,
    difficulty: 'medium'
  },
  {
    id: 'feature-implementation',
    name: 'Feature Implementation',
    description: 'Implement a new feature or enhancement',
    target: 'Implement {{feature_name}} feature with the following requirements: {{requirements}}',
    tags: ['feature', 'enhancement'],
    estimatedDuration: 60,
    difficulty: 'hard'
  },
  {
    id: 'code-refactor',
    name: 'Code Refactoring',
    description: 'Refactor existing code to improve quality or performance',
    target: 'Refactor {{component_name}} to improve {{improvement_area}}',
    tags: ['refactor', 'improvement'],
    estimatedDuration: 45,
    difficulty: 'medium'
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Create or update documentation',
    target: 'Create comprehensive documentation for {{component_name}}',
    tags: ['documentation', 'docs'],
    estimatedDuration: 20,
    difficulty: 'easy'
  },
  {
    id: 'testing',
    name: 'Add Tests',
    description: 'Add unit tests or integration tests',
    target: 'Add comprehensive tests for {{component_name}} with {{coverage_percentage}}% coverage',
    tags: ['testing', 'quality'],
    estimatedDuration: 40,
    difficulty: 'medium'
  },
  {
    id: 'security-fix',
    name: 'Security Fix',
    description: 'Address security vulnerabilities',
    target: 'Fix security vulnerability: {{vulnerability_description}}',
    tags: ['security', 'vulnerability'],
    estimatedDuration: 35,
    difficulty: 'hard'
  }
];

export const CreateAgentRun: React.FC<CreateAgentRunProps> = ({
  organizationId,
  onAgentRunCreated,
  onCancel,
  initialValues = {},
  showRepositorySelector = true
}) => {
  const [state, setState] = useState<CreateAgentRunState>({
    loading: true,
    submitting: false,
    repositories: [],
    templates: AGENT_RUN_TEMPLATES
  });

  const [form, setForm] = useState<CreateAgentRunForm>({
    ...DEFAULT_FORM_VALUES,
    organizationId,
    ...initialValues
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentRunTemplate | null>(null);

  // Load repositories
  const loadRepositories = async () => {
    if (!showRepositorySelector) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const creds = credentials.getCredentials();
      if (!creds.GITHUB_TOKEN) {
        throw new Error('GitHub token is required');
      }

      // Mock API call - replace with actual GitHub API
      const mockRepositories: Repository[] = [
        {
          id: 'repo-1',
          name: 'web-app',
          fullName: 'acme-corp/web-app',
          description: 'Main web application',
          private: false,
          defaultBranch: 'main',
          language: 'TypeScript',
          updatedAt: Date.now() - 3600000
        },
        {
          id: 'repo-2',
          name: 'api-server',
          fullName: 'acme-corp/api-server',
          description: 'Backend API server',
          private: true,
          defaultBranch: 'main',
          language: 'Python',
          updatedAt: Date.now() - 7200000
        },
        {
          id: 'repo-3',
          name: 'mobile-app',
          fullName: 'acme-corp/mobile-app',
          description: 'React Native mobile application',
          private: false,
          defaultBranch: 'develop',
          language: 'JavaScript',
          updatedAt: Date.now() - 1800000
        }
      ];

      setState(prev => ({
        ...prev,
        repositories: mockRepositories,
        loading: false
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load repositories';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // Handle form field changes
  const handleFormChange = (field: keyof CreateAgentRunForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle template selection
  const handleTemplateSelect = (template: AgentRunTemplate) => {
    setSelectedTemplate(template);
    setForm(prev => ({
      ...prev,
      target: template.target,
      description: template.description,
      tags: [...template.tags]
    }));
  };

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input key press
  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!form.target.trim()) {
      return 'Target is required';
    }
    if (form.target.length < 10) {
      return 'Target must be at least 10 characters long';
    }
    if (showRepositorySelector && !form.repositoryId) {
      return 'Repository selection is required';
    }
    return null;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error('Validation Error', validationError);
      return;
    }

    setState(prev => ({ ...prev, submitting: true }));

    try {
      // Mock API call - replace with actual Codegen API
      const newAgentRun: AgentRun = {
        id: `run-${Date.now()}`,
        organizationId: form.organizationId,
        repositoryId: form.repositoryId,
        status: 'pending',
        target: form.target,
        description: form.description || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          priority: form.priority,
          autoConfirmPlan: form.autoConfirmPlan,
          autoMergePR: form.autoMergePR,
          templateId: selectedTemplate?.id
        },
        tags: form.tags.length > 0 ? form.tags : undefined
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setState(prev => ({ ...prev, submitting: false }));
      
      toast.success('Agent Run Created', 'Your agent run has been created and will start shortly');
      notifications.add('agent_run_started', 'Agent Run Started', form.target, {
        data: { agentRunId: newAgentRun.id }
      });

      onAgentRunCreated?.(newAgentRun);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent run';
      setState(prev => ({ ...prev, submitting: false }));
      toast.error('Creation Failed', errorMessage);
    }
  };

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, [organizationId]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading repositories...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Agent Run</h2>
          <p className="text-gray-600 mt-1">
            Configure and start a new AI agent to work on your project
          </p>
        </div>
        {onCancel && (
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Templates */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.templates.map(template => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <Badge
                      className={
                        template.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        template.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {template.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{template.estimatedDuration}min</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Repository Selection */}
        {showRepositorySelector && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository</h3>
              <Select
                value={form.repositoryId || ''}
                onChange={(value) => handleFormChange('repositoryId', value)}
                placeholder="Select a repository"
                required
              >
                {state.repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName} {repo.private && '(Private)'}
                  </option>
                ))}
              </Select>
              {form.repositoryId && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const repo = state.repositories.find(r => r.id === form.repositoryId);
                    return repo ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{repo.name}</p>
                          <p className="text-sm text-gray-600">{repo.description}</p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{repo.language}</p>
                          <p>Default: {repo.defaultBranch}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Target Configuration */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Target & Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={form.target}
                  onChange={(e) => handleFormChange('target', e.target.value)}
                  placeholder="Describe what you want the agent to accomplish..."
                  rows={3}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific about what you want the agent to do. Include relevant details, requirements, or constraints.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Optional: Add more context, background information, or specific requirements..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Tags and Priority */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags & Priority</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex space-x-2 mb-3">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    Add
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <Select
                  value={form.priority}
                  onChange={(value) => handleFormChange('priority', value as CreateAgentRunForm['priority'])}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Automation Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={form.autoConfirmPlan}
                  onChange={(e) => handleFormChange('autoConfirmPlan', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-confirm proposed plan</span>
                  <p className="text-xs text-gray-500">
                    Automatically approve the agent's execution plan without manual review
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={form.autoMergePR}
                  onChange={(e) => handleFormChange('autoMergePR', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Auto-merge validated PR</span>
                  <p className="text-xs text-gray-500">
                    Automatically merge pull requests that pass all validation checks
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={state.submitting}
            className="min-w-[120px]"
          >
            {state.submitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Create & Start
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateAgentRun;

