import React, { useState, useEffect } from 'react';
import type { Project, GlobalSettings } from '../../types';
import { Card, Button, Textarea } from '../ui';
import { XIcon, DocumentTextIcon, PlusIcon, SaveIcon } from '../icons';

interface MarkdownViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  globalSettings: GlobalSettings;
  fileName: 'README.md' | 'PLAN.md';
  onUpdateProject?: (updatedProject: Project | ((p: Project) => Project)) => void;
}

export const MarkdownViewerModal: React.FC<MarkdownViewerModalProps> = ({
  isOpen,
  onClose,
  project,
  globalSettings,
  fileName,
  onUpdateProject
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFileContent = async () => {
    if (!globalSettings.GITHUB_TOKEN) {
      setError('GitHub token is required to fetch file content');
      return;
    }

    setIsLoading(true);
    setError(null);

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

      if (response.status === 404) {
        setFileExists(false);
        setContent('');
      } else if (response.ok) {
        const data = await response.json();
        const decodedContent = atob(data.content);
        setContent(decodedContent);
        setFileExists(true);
      } else {
        throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file content');
    } finally {
      setIsLoading(false);
    }
  };

  const createFile = async () => {
    if (!globalSettings.GITHUB_TOKEN) {
      setError('GitHub token is required to create file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${project.full_name}/contents/${fileName}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${globalSettings.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Add ${fileName}`,
            content: btoa(content),
            branch: project.settings.branch || 'main',
          }),
        }
      );

      if (response.ok) {
        setFileExists(true);
        setIsEditing(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create ${fileName}: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFile = async () => {
    if (!globalSettings.GITHUB_TOKEN) {
      setError('GitHub token is required to update file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First get the current file to get its SHA
      const getResponse = await fetch(
        `https://api.github.com/repos/${project.full_name}/contents/${fileName}`,
        {
          headers: {
            Authorization: `Bearer ${globalSettings.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Failed to get current file: ${getResponse.status}`);
      }

      const currentFile = await getResponse.json();

      // Update the file
      const updateResponse = await fetch(
        `https://api.github.com/repos/${project.full_name}/contents/${fileName}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${globalSettings.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Update ${fileName}`,
            content: btoa(content),
            sha: currentFile.sha,
            branch: project.settings.branch || 'main',
          }),
        }
      );

      if (updateResponse.ok) {
        setIsEditing(false);
      } else {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update ${fileName}: ${updateResponse.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update file');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFileContent();
    }
  }, [isOpen, project.full_name, fileName, globalSettings.GITHUB_TOKEN]);

  const handleSave = async () => {
    if (fileExists) {
      await updateFile();
    } else {
      await createFile();
    }
    // Notify parent component that file status has changed
    if (onUpdateProject) {
      // Trigger a re-render by calling onUpdateProject with the same project
      onUpdateProject(project);
    }
  };

  const handleCreate = () => {
    setContent('');
    setIsEditing(true);
    setFileExists(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 p-4 bg-gray-900/50 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">
              {fileName} - {project.full_name}
            </h2>
          </div>
          <Button variant="ghost" className="p-2" onClick={onClose}>
            <XIcon className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-grow p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            </div>
          ) : !fileExists && !isEditing ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 mb-4">
                {fileName} does not exist in this repository.
              </p>
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                Create {fileName}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {fileExists ? 'File exists' : 'Creating new file'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!isEditing && (
                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )}
                  {isEditing && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        <SaveIcon className="w-4 h-4" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Enter ${fileName} content...`}
                  className="font-mono text-sm min-h-[400px]"
                  rows={20}
                />
              ) : (
                <div className="bg-black/30 rounded-md p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {content || 'No content'}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 