import React, { useState, useEffect } from 'react';
import type { GithubRepo } from '../types';
import { getGithubRepos } from '../services/github_service';
import { Button, Select, Spinner } from './ui';
import { PlusIcon, CodeIcon, SettingsIcon } from './icons';

interface HeaderProps {
  onAddProject: (repo: GithubRepo) => void;
  onOpenSettings: () => void;
  githubToken: string;
}

export const Header: React.FC<HeaderProps> = ({ onAddProject, onOpenSettings, githubToken }) => {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (githubToken) {
      setIsLoading(true);
      getGithubRepos(githubToken).then(data => {
        setRepos(data);
        if (data.length > 0) {
          setSelectedRepoFullName(data[0].full_name);
        } else {
          setSelectedRepoFullName('');
        }
        setIsLoading(false);
      });
    } else {
      setRepos([]);
      setSelectedRepoFullName('');
      setIsLoading(false);
    }
  }, [githubToken]);

  const handleAddClick = () => {
    const repoToAdd = repos.find(r => r.full_name === selectedRepoFullName);
    if (repoToAdd) {
      onAddProject(repoToAdd);
    }
  };

  return (
    <header className="p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
            <CodeIcon className="w-8 h-8 text-indigo-400"/>
            <h1 className="sr-only">CodeGen Orchestrator</h1>
        </div>
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Spinner className="h-5 w-5" />
              <span>Loading Repos...</span>
            </div>
          ) : (
            <>
              <Select
                value={selectedRepoFullName}
                onChange={e => setSelectedRepoFullName(e.target.value)}
                className="w-64"
                disabled={repos.length === 0}
              >
                {repos.length > 0 ? (
                  repos.map(repo => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(Private)' : ''}
                    </option>
                  ))
                ) : (
                  <option>
                    {githubToken ? 'No repositories found' : 'Set GitHub Token in Settings'}
                  </option>
                )}
              </Select>
              <Button onClick={handleAddClick} disabled={!selectedRepoFullName}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Project
              </Button>
            </>
          )}
          <div className="h-8 w-px bg-gray-600 mx-2"></div>
          <Button variant="ghost" className="p-2" onClick={onOpenSettings} aria-label="Global Settings">
              <SettingsIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};