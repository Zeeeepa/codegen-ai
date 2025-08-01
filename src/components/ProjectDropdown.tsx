import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Github, Search, X } from 'lucide-react';
import { CachedProject } from '../api/types';
import { GitHubRepository } from '../api/githubTypes';
import { getCachedProjects, getSelectedProject, setSelectedProject, addProjectToCache, githubRepoToProject } from '../storage/projectCache';
import { getGitHubClient } from '../api/github';
import { getPreferenceValues } from '../utils/preferences';
import toast from 'react-hot-toast';

interface ProjectDropdownProps {
  onProjectChange?: (project: CachedProject | null) => void;
}

export function ProjectDropdown({ onProjectChange }: ProjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<CachedProject[]>([]);
  const [selectedProject, setSelectedProjectState] = useState<CachedProject | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load projects and selected project on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddProject(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadProjects = async () => {
    try {
      const cachedProjects = await getCachedProjects();
      setProjects(cachedProjects);

      const selectedId = await getSelectedProject();
      if (selectedId) {
        const selected = cachedProjects.find(p => p.id === selectedId);
        if (selected) {
          setSelectedProjectState(selected);
          onProjectChange?.(selected);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleProjectSelect = async (project: CachedProject) => {
    try {
      setSelectedProjectState(project);
      await setSelectedProject(project.id);
      setIsOpen(false);
      onProjectChange?.(project);
      toast.success(`Selected project: ${project.name}`);
    } catch (error) {
      console.error('Failed to select project:', error);
      toast.error('Failed to select project');
    }
  };

  const loadAvailableRepositories = async () => {
    setLoadingRepos(true);
    try {
      const preferences = await getPreferenceValues();
      if (!preferences.githubToken) {
        toast.error('GitHub token not configured. Please set it up in Settings.');
        return;
      }

      const client = getGitHubClient(preferences.githubToken);
      const repos = await client.getUserRepositories({
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      // Filter out repos that are already added as projects
      const existingProjectIds = projects.map(p => p.id);
      const availableRepos = repos.filter(repo => !existingProjectIds.includes(repo.full_name));
      
      setAvailableRepos(availableRepos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      toast.error('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleAddProject = async (repo: GitHubRepository) => {
    try {
      const project = githubRepoToProject(repo);
      await addProjectToCache(project);
      
      // Reload projects
      await loadProjects();
      
      // Select the newly added project
      await handleProjectSelect({ ...project, lastUpdated: new Date().toISOString() });
      
      setShowAddProject(false);
      toast.success(`Added project: ${repo.name}`);
    } catch (error) {
      console.error('Failed to add project:', error);
      toast.error('Failed to add project');
    }
  };

  const filteredRepos = availableRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 transition-colors"
      >
        <Github className="h-4 w-4 mr-2" />
        <span className="max-w-48 truncate">
          {selectedProject ? selectedProject.name : 'Select Project'}
        </span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50">
          {!showAddProject ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-600">
                <h3 className="text-sm font-medium text-white">Select Project</h3>
              </div>

              {/* Project List */}
              <div className="max-h-64 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-400">
                    <p className="text-sm">No projects added yet</p>
                    <p className="text-xs mt-1">Click "Add Project" to get started</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                        selectedProject?.id === project.id ? 'bg-blue-900/20 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{project.name}</p>
                          <p className="text-xs text-gray-400 truncate">{project.fullName}</p>
                          {project.description && (
                            <p className="text-xs text-gray-300 mt-1 line-clamp-2">{project.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          {project.prCount !== undefined && project.prCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                              {project.prCount}
                            </span>
                          )}
                          {project.language && (
                            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {project.language}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-600">
                <button
                  onClick={() => {
                    setShowAddProject(true);
                    loadAvailableRepositories();
                  }}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Add Project Header */}
              <div className="px-4 py-3 border-b border-gray-600 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Add Project from GitHub</h3>
                <button
                  onClick={() => setShowAddProject(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-gray-600">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Repository List */}
              <div className="max-h-64 overflow-y-auto">
                {loadingRepos ? (
                  <div className="px-4 py-3 text-center text-gray-400">
                    <p className="text-sm">Loading repositories...</p>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-400">
                    <p className="text-sm">
                      {searchQuery ? 'No repositories match your search' : 'No available repositories'}
                    </p>
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleAddProject(repo)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{repo.name}</p>
                          <p className="text-xs text-gray-400 truncate">{repo.full_name}</p>
                          {repo.description && (
                            <p className="text-xs text-gray-300 mt-1 line-clamp-2">{repo.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          {repo.language && (
                            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                              {repo.language}
                            </span>
                          )}
                          {repo.private && (
                            <span className="px-2 py-1 text-xs bg-yellow-700 text-yellow-200 rounded">
                              Private
                            </span>
                          )}
                          <span className="text-xs text-gray-400">⭐ {repo.stargazers_count}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
