// Load environment variables first
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Building, Star, StarOff, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { getAPIClient } from "./api/client";
import { validateCredentials, hasCredentials } from "./utils/credentials";

import { useCurrentUser } from "./hooks/useCurrentUser";

// Type for organizations from validation (simplified structure)
type BasicOrganization = {
  id: number;
  name: string;
};

export default function ListOrganizations() {
  const [organizations, setOrganizations] = useState<BasicOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultOrgId, setDefaultOrgId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const navigate = useNavigate();
  const apiClient = getAPIClient();
  const { displayName: userDisplayName } = useCurrentUser();

  // Load organizations and default org preference
  useEffect(() => {
    async function loadData() {
      if (!hasCredentials()) {
        setError("API token not configured. Please set it in extension preferences.");
        setIsLoading(false);
        return;
      }

      try {
        // Validate credentials and get organizations
        const validation = await validateCredentials();
        if (!validation.isValid) {
          setError(validation.error || "Invalid credentials");
          setIsLoading(false);
          return;
        }

        if (validation.organizations) {
          setOrganizations(validation.organizations);
        }

        // Load default organization preference
        const defaultOrg = localStorage.getItem("defaultOrganizationId");
        if (defaultOrg) {
          setDefaultOrgId(parseInt(defaultOrg, 10));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Set default organization
  const setDefaultOrganization = async (orgId: number) => {
    try {
      const selectedOrg = organizations.find(org => org.id === orgId);
      
      // Store both the ID and the full organization data
      localStorage.setItem("defaultOrganizationId", orgId.toString());
      if (selectedOrg) {
        localStorage.setItem("defaultOrganization", JSON.stringify(selectedOrg));
      }
      
      setDefaultOrgId(orgId);
      
      toast.success(`${selectedOrg?.name || 'Organization'} will be used as default for new agent runs`, {
        duration: 4000,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set default organization");
    }
  };

  // Clear default organization
  const clearDefaultOrganization = async () => {
    try {
      localStorage.removeItem("defaultOrganizationId");
      localStorage.removeItem("defaultOrganization");
      setDefaultOrgId(null);
      
      toast.success("No default organization is set");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear default organization");
    }
  };

  // Refresh organizations
  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const validation = await validateCredentials();
      if (validation.isValid && validation.organizations) {
        setOrganizations(validation.organizations);
      } else {
        setError(validation.error || "Failed to load organizations");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh organizations");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Organizations</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const navigationTitle = userDisplayName ? `Organizations - ${userDisplayName}` : "Organizations";

  // Filter organizations based on search text
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{navigationTitle}</h1>
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="mt-4 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading organizations...</p>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchText ? "No Matching Organizations" : "No Organizations Found"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchText ? "Try adjusting your search terms" : "You don't have access to any organizations"}
          </p>
          <button
            onClick={refresh}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid gap-4">{
        filteredOrganizations.map((org) => {
          const isDefault = defaultOrgId === org.id;
          
          const copyToClipboard = async (text: string, label: string) => {
            try {
              await navigator.clipboard.writeText(text);
              toast.success(`${label} copied to clipboard`);
            } catch (error) {
              toast.error(`Failed to copy ${label.toLowerCase()}`);
            }
          };
          
          return (
            <div
              key={org.id}
              className="bg-black rounded-lg border border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {isDefault ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <Building className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-white">{org.name}</h3>
                    <p className="text-sm text-gray-400">Organization ID: {org.id}</p>
                    {isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-200 mt-1">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isDefault ? (
                    <button
                      onClick={() => setDefaultOrganization(org.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-200 bg-yellow-900 hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-gray-800"
                      title="Set as Default (Cmd+D)"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Set Default
                    </button>
                  ) : (
                    <button
                      onClick={clearDefaultOrganization}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800"
                      title="Clear Default (Cmd+D)"
                    >
                      <StarOff className="h-3 w-3 mr-1" />
                      Clear Default
                    </button>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(org.id.toString(), "Organization ID")}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                    title="Copy Organization ID (Cmd+C)"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy ID
                  </button>
                  
                  <button
                    onClick={() => copyToClipboard(org.name, "Organization Name")}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                    title="Copy Organization Name (Cmd+Shift+C)"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Name
                  </button>
                  
                  <button
                    onClick={() => {
                      // Use apiClient to check organization details
                      console.log('API Client available:', !!apiClient);
                      // Navigate to agent runs for this organization
                      navigate('/list-agent-runs');
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="View Agent Runs"
                  >
                    View Runs
                  </button>
                  
                  <button
                    onClick={refresh}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    title="Refresh (Cmd+R)"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
        }</div>
      )}
    </div>
  );
}
