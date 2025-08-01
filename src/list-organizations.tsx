/**
 * Organization listing and management component
 * Displays available organizations and allows switching between them
 */

import React, { useState, useEffect } from 'react';
import { credentials } from './utils/credentials';
import { userProfile } from './utils/userProfile';
import { toast } from './utils/toast';
import { Card, Button, Input, Badge, LoadingSpinner } from './components/ui';
import { SearchIcon, BuildingIcon, UsersIcon, SettingsIcon } from './components/icons';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  memberCount?: number;
  repositoryCount?: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  features?: string[];
  createdAt: number;
  updatedAt: number;
}

interface OrganizationListState {
  organizations: Organization[];
  loading: boolean;
  error?: string;
  selectedOrgId?: string;
}

interface ListOrganizationsProps {
  onOrganizationSelect?: (organization: Organization) => void;
  selectedOrganizationId?: string;
  showActions?: boolean;
  compact?: boolean;
}

export const ListOrganizations: React.FC<ListOrganizationsProps> = ({
  onOrganizationSelect,
  selectedOrganizationId,
  showActions = true,
  compact = false
}) => {
  const [state, setState] = useState<OrganizationListState>({
    organizations: [],
    loading: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Load organizations
  const loadOrganizations = async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const creds = credentials.getCredentials();
      if (!creds.CODEGEN_API_TOKEN) {
        throw new Error('Codegen API token is required');
      }

      // Mock API call - replace with actual Codegen API
      const mockOrganizations: Organization[] = [
        {
          id: 'org-1',
          name: 'Acme Corporation',
          slug: 'acme-corp',
          description: 'Building the future of software development',
          memberCount: 25,
          repositoryCount: 150,
          role: 'admin',
          features: ['agent-runs', 'advanced-analytics', 'custom-integrations'],
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now() - 3600000
        },
        {
          id: 'org-2',
          name: 'Startup Inc',
          slug: 'startup-inc',
          description: 'Fast-moving startup focused on AI automation',
          memberCount: 8,
          repositoryCount: 45,
          role: 'owner',
          features: ['agent-runs', 'basic-analytics'],
          createdAt: Date.now() - 86400000 * 60,
          updatedAt: Date.now() - 7200000
        },
        {
          id: 'org-3',
          name: 'Enterprise Solutions',
          slug: 'enterprise-solutions',
          description: 'Large-scale enterprise software solutions',
          memberCount: 200,
          repositoryCount: 500,
          role: 'member',
          features: ['agent-runs', 'advanced-analytics', 'enterprise-support'],
          createdAt: Date.now() - 86400000 * 90,
          updatedAt: Date.now() - 1800000
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      setState(prev => ({
        ...prev,
        organizations: mockOrganizations,
        loading: false,
        selectedOrgId: selectedOrganizationId || mockOrganizations[0]?.id
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load organizations';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      toast.error('Failed to load organizations', errorMessage);
    }
  };

  // Handle organization selection
  const handleOrganizationSelect = (organization: Organization) => {
    setState(prev => ({ ...prev, selectedOrgId: organization.id }));
    onOrganizationSelect?.(organization);
    toast.success('Organization selected', `Switched to ${organization.name}`);
  };

  // Filter organizations based on search and role
  const filteredOrganizations = state.organizations.filter(org => {
    const matchesSearch = !searchQuery || 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || org.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: Organization['role']): string => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return colors[role];
  };

  // Format member count
  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading organizations...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <BuildingIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Failed to load organizations</p>
          <p className="text-sm text-gray-500 mt-1">{state.error}</p>
        </div>
        <Button onClick={loadOrganizations} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {filteredOrganizations.map(org => (
          <div
            key={org.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
              state.selectedOrgId === org.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleOrganizationSelect(org)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                {org.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{org.name}</p>
                <p className="text-sm text-gray-500">{org.slug}</p>
              </div>
            </div>
            <Badge className={getRoleBadgeColor(org.role)}>
              {org.role}
            </Badge>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
          <p className="text-gray-600 mt-1">
            Select an organization to manage projects and agent runs
          </p>
        </div>
        {showActions && (
          <Button onClick={loadOrganizations} variant="outline">
            Refresh
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* Organizations Grid */}
      {filteredOrganizations.length === 0 ? (
        <div className="text-center py-12">
          <BuildingIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">No organizations found</p>
          <p className="text-gray-500 text-sm mt-1">
            {searchQuery || filterRole !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'You don\'t have access to any organizations yet'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map(org => (
            <Card
              key={org.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                state.selectedOrgId === org.id
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleOrganizationSelect(org)}
            >
              <div className="p-6">
                {/* Organization Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-500">@{org.slug}</p>
                    </div>
                  </div>
                  <Badge className={getRoleBadgeColor(org.role)}>
                    {org.role}
                  </Badge>
                </div>

                {/* Description */}
                {org.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {org.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="w-4 h-4" />
                    <span>{formatCount(org.memberCount || 0)} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BuildingIcon className="w-4 h-4" />
                    <span>{formatCount(org.repositoryCount || 0)} repos</span>
                  </div>
                </div>

                {/* Features */}
                {org.features && org.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {org.features.slice(0, 3).map(feature => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-xs"
                      >
                        {feature.replace('-', ' ')}
                      </Badge>
                    ))}
                    {org.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{org.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Selection Indicator */}
                {state.selectedOrgId === org.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                      Currently selected
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListOrganizations;

