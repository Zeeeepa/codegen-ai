// Project Cache Storage System

import { LocalStorage } from '../utils/storage';
import { Project, CachedProject, ProjectFilters } from '../api/types';
import { GitHubRepository } from '../api/githubTypes';
import { getGitHubClient } from '../api/github';

const PROJECTS_CACHE_KEY = 'projects_cache';
const SELECTED_PROJECT_KEY = 'selected_project';
const PROJECT_AGENT_RUNS_KEY = 'project_agent_runs';

// Convert GitHub repository to Project
export function githubRepoToProject(repo: GitHubRepository): Project {
  return {
    id: repo.full_name,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    private: repo.private,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    owner: {
      login: repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
    },
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    addedAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
    agentRunIds: [],
  };
}

// Get all cached projects
export async function getCachedProjects(): Promise<CachedProject[]> {
  try {
    const cached = await LocalStorage.getItem(PROJECTS_CACHE_KEY);
    if (cached) {
      const projects = JSON.parse(cached) as CachedProject[];
      return projects;
    }
    return [];
  } catch (error) {
    console.error('Failed to get cached projects:', error);
    return [];
  }
}

// Save projects to cache
export async function setCachedProjects(projects: CachedProject[]): Promise<void> {
  try {
    const projectsWithTimestamp = projects.map(project => ({
      ...project,
      lastUpdated: new Date().toISOString(),
    }));
    await LocalStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projectsWithTimestamp));
  } catch (error) {
    console.error('Failed to cache projects:', error);
    throw error;
  }
}

// Add a project to cache
export async function addProjectToCache(project: Project): Promise<void> {
  try {
    const cached = await getCachedProjects();
    const existing = cached.find(p => p.id === project.id);
    
    if (existing) {
      // Update existing project
      const updated = cached.map(p => 
        p.id === project.id 
          ? { ...project, lastUpdated: new Date().toISOString() }
          : p
      );
      await setCachedProjects(updated);
    } else {
      // Add new project
      const newProject: CachedProject = {
        ...project,
        lastUpdated: new Date().toISOString(),
      };
      await setCachedProjects([...cached, newProject]);
    }
  } catch (error) {
    console.error('Failed to add project to cache:', error);
    throw error;
  }
}

// Remove a project from cache
export async function removeProjectFromCache(projectId: string): Promise<void> {
  try {
    const cached = await getCachedProjects();
    const filtered = cached.filter(p => p.id !== projectId);
    await setCachedProjects(filtered);
    
    // Also remove any agent run associations
    await removeProjectAgentRunAssociations(projectId);
  } catch (error) {
    console.error('Failed to remove project from cache:', error);
    throw error;
  }
}

// Get selected project
export async function getSelectedProject(): Promise<string | null> {
  try {
    const selected = await LocalStorage.getItem(SELECTED_PROJECT_KEY);
    return selected || null;
  } catch (error) {
    console.error('Failed to get selected project:', error);
    return null;
  }
}

// Set selected project
export async function setSelectedProject(projectId: string | null): Promise<void> {
  try {
    if (projectId) {
      await LocalStorage.setItem(SELECTED_PROJECT_KEY, projectId);
    } else {
      await LocalStorage.removeItem(SELECTED_PROJECT_KEY);
    }
  } catch (error) {
    console.error('Failed to set selected project:', error);
    throw error;
  }
}

// Filter projects
export function filterProjects(projects: CachedProject[], filters: ProjectFilters): CachedProject[] {
  let filtered = [...projects];

  // Search query filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.fullName.toLowerCase().includes(query) ||
      (project.description && project.description.toLowerCase().includes(query))
    );
  }

  // Language filter
  if (filters.language) {
    filtered = filtered.filter(project => project.language === filters.language);
  }

  // Private filter
  if (filters.private !== undefined) {
    filtered = filtered.filter(project => project.private === filters.private);
  }

  // Sort
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'stars':
          aValue = a.stargazersCount;
          bValue = b.stargazersCount;
          break;
        case 'prCount':
          aValue = a.prCount || 0;
          bValue = b.prCount || 0;
          break;
        default:
          return 0;
      }

      if (filters.sortDirection === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
  }

  return filtered;
}

// Project-Agent Run Associations
interface ProjectAgentRunAssociation {
  projectId: string;
  agentRunId: number;
  associatedAt: string;
}

// Get project-agent run associations
export async function getProjectAgentRunAssociations(): Promise<ProjectAgentRunAssociation[]> {
  try {
    const associations = await LocalStorage.getItem(PROJECT_AGENT_RUNS_KEY);
    if (associations) {
      return JSON.parse(associations) as ProjectAgentRunAssociation[];
    }
    return [];
  } catch (error) {
    console.error('Failed to get project-agent run associations:', error);
    return [];
  }
}

// Associate agent run with project
export async function associateAgentRunWithProject(projectId: string, agentRunId: number): Promise<void> {
  try {
    const associations = await getProjectAgentRunAssociations();
    const existing = associations.find(a => a.projectId === projectId && a.agentRunId === agentRunId);
    
    if (!existing) {
      const newAssociation: ProjectAgentRunAssociation = {
        projectId,
        agentRunId,
        associatedAt: new Date().toISOString(),
      };
      associations.push(newAssociation);
      await LocalStorage.setItem(PROJECT_AGENT_RUNS_KEY, JSON.stringify(associations));
      
      // Update project cache to include the agent run ID
      const projects = await getCachedProjects();
      const updatedProjects = projects.map(project => {
        if (project.id === projectId) {
          return {
            ...project,
            agentRunIds: [...(project.agentRunIds || []), agentRunId],
          };
        }
        return project;
      });
      await setCachedProjects(updatedProjects);
    }
  } catch (error) {
    console.error('Failed to associate agent run with project:', error);
    throw error;
  }
}

// Remove agent run association from project
export async function removeAgentRunFromProject(projectId: string, agentRunId: number): Promise<void> {
  try {
    const associations = await getProjectAgentRunAssociations();
    const filtered = associations.filter(a => !(a.projectId === projectId && a.agentRunId === agentRunId));
    await LocalStorage.setItem(PROJECT_AGENT_RUNS_KEY, JSON.stringify(filtered));
    
    // Update project cache to remove the agent run ID
    const projects = await getCachedProjects();
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          agentRunIds: (project.agentRunIds || []).filter(id => id !== agentRunId),
        };
      }
      return project;
    });
    await setCachedProjects(updatedProjects);
  } catch (error) {
    console.error('Failed to remove agent run from project:', error);
    throw error;
  }
}

// Remove all associations for a project
export async function removeProjectAgentRunAssociations(projectId: string): Promise<void> {
  try {
    const associations = await getProjectAgentRunAssociations();
    const filtered = associations.filter(a => a.projectId !== projectId);
    await LocalStorage.setItem(PROJECT_AGENT_RUNS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove project agent run associations:', error);
    throw error;
  }
}

// Get agent runs for a project
export async function getAgentRunsForProject(projectId: string): Promise<number[]> {
  try {
    const associations = await getProjectAgentRunAssociations();
    return associations
      .filter(a => a.projectId === projectId)
      .map(a => a.agentRunId);
  } catch (error) {
    console.error('Failed to get agent runs for project:', error);
    return [];
  }
}

// Update PR count for a project
export async function updateProjectPRCount(projectId: string, prCount: number): Promise<void> {
  try {
    const projects = await getCachedProjects();
    const updatedProjects = projects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          prCount,
          lastSyncAt: new Date().toISOString(),
        };
      }
      return project;
    });
    await setCachedProjects(updatedProjects);
  } catch (error) {
    console.error('Failed to update project PR count:', error);
    throw error;
  }
}

// Sync project data with GitHub
export async function syncProjectWithGitHub(projectId: string, githubToken: string): Promise<void> {
  try {
    const client = getGitHubClient(githubToken);
    const [owner, repo] = projectId.split('/');
    
    if (!owner || !repo) {
      throw new Error('Invalid project ID format');
    }
    
    // Get updated repository data
    const repoData = await client.getRepository(owner, repo);
    
    // Get PR count
    const prs = await client.getPullRequestsAheadOfMain(owner, repo, repoData.default_branch);
    
    // Update project in cache
    const updatedProject = githubRepoToProject(repoData);
    updatedProject.prCount = prs.length;
    updatedProject.lastSyncAt = new Date().toISOString();
    
    await addProjectToCache(updatedProject);
  } catch (error) {
    console.error('Failed to sync project with GitHub:', error);
    throw error;
  }
}

// Clear all project cache
export async function clearProjectCache(): Promise<void> {
  try {
    await LocalStorage.removeItem(PROJECTS_CACHE_KEY);
    await LocalStorage.removeItem(SELECTED_PROJECT_KEY);
    await LocalStorage.removeItem(PROJECT_AGENT_RUNS_KEY);
  } catch (error) {
    console.error('Failed to clear project cache:', error);
    throw error;
  }
}
