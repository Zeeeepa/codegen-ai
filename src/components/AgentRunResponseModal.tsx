import React from 'react';
import { X, ExternalLink, Copy } from 'lucide-react';
import { CachedAgentRun } from '../api/types';

interface AgentRunResponseModalProps {
  run: CachedAgentRun;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentRunResponseModal({ run, isOpen, onClose }: AgentRunResponseModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to add a toast notification here
      console.log(successMessage);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatResponse = (response: string | undefined) => {
    if (!response) return 'No response available';
    
    try {
      // Try to parse as JSON for pretty formatting
      const parsed = JSON.parse(response);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, return as-is
      return response;
    }
  };

  const isJsonResponse = (response: string | undefined) => {
    if (!response) return false;
    try {
      JSON.parse(response);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-white">
                  Agent Run #{run.id} Response
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  run.status === 'COMPLETE' 
                    ? 'bg-green-100 text-green-800' 
                    : run.status === 'ERROR' || run.status === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {run.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(run.web_url, '_blank')}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                  title="Open in Browser"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-sm font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-800 px-6 py-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">Response Content</h4>
                {run.result && (
                  <button
                    onClick={() => copyToClipboard(run.result!, 'Response copied to clipboard')}
                    className="inline-flex items-center px-2 py-1 border border-gray-600 text-xs font-medium rounded text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 focus:ring-offset-gray-800"
                    title="Copy Response"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </button>
                )}
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className={`text-sm ${isJsonResponse(run.result) ? 'text-green-400' : 'text-gray-300'} whitespace-pre-wrap font-mono`}>
                  {formatResponse(run.result)}
                </pre>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Created:</span>
                <span className="text-gray-300 ml-2">
                  {new Date(run.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Organization:</span>
                <span className="text-gray-300 ml-2">
                  {run.organizationName || `ID: ${run.organization_id}`}
                </span>
              </div>
              {run.lastUpdated && (
                <div>
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-gray-300 ml-2">
                    {new Date(run.lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-6 py-3 border-t border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
