/**
 * Agent Run Response Modal Component
 * Modal for displaying agent responses and handling user interactions
 */

import React, { useState } from 'react';
import { Modal, Button, Textarea, Card, Badge } from './ui';
import { 
  XIcon, 
  CheckIcon, 
  EditIcon, 
  PlayIcon,
  AlertCircleIcon,
  InfoIcon,
  ExternalLinkIcon
} from './icons';
import type { AgentRun, AgentPlan } from '../hooks/useCachedAgentRuns';

export type AgentResponseType = 'plan_proposal' | 'pr_created' | 'error' | 'info' | 'confirmation_required';

export interface AgentResponse {
  id: string;
  type: AgentResponseType;
  title: string;
  message: string;
  data?: any;
  timestamp: number;
  requiresResponse?: boolean;
}

interface AgentRunResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentRun: AgentRun;
  response: AgentResponse;
  onResponseSubmit?: (response: string, action?: string) => void;
  onPlanApprove?: (planId: string) => void;
  onPlanModify?: (planId: string, modifications: string) => void;
}

export const AgentRunResponseModal: React.FC<AgentRunResponseModalProps> = ({
  isOpen,
  onClose,
  agentRun,
  response,
  onResponseSubmit,
  onPlanApprove,
  onPlanModify
}) => {
  const [userResponse, setUserResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [modifications, setModifications] = useState('');

  const handleSubmitResponse = async (action?: string) => {
    if (!userResponse.trim() && !action) return;

    setIsSubmitting(true);
    try {
      await onResponseSubmit?.(userResponse, action);
      setUserResponse('');
      onClose();
    } catch (error) {
      console.error('Failed to submit response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanApprove = async () => {
    if (response.data?.plan?.id) {
      setIsSubmitting(true);
      try {
        await onPlanApprove?.(response.data.plan.id);
        onClose();
      } catch (error) {
        console.error('Failed to approve plan:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePlanModify = async () => {
    if (response.data?.plan?.id && modifications.trim()) {
      setIsSubmitting(true);
      try {
        await onPlanModify?.(response.data.plan.id, modifications);
        setModifications('');
        setShowModifyForm(false);
        onClose();
      } catch (error) {
        console.error('Failed to modify plan:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getResponseIcon = () => {
    switch (response.type) {
      case 'plan_proposal':
        return <InfoIcon className="w-6 h-6 text-blue-600" />;
      case 'pr_created':
        return <CheckIcon className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircleIcon className="w-6 h-6 text-red-600" />;
      case 'confirmation_required':
        return <AlertCircleIcon className="w-6 h-6 text-yellow-600" />;
      default:
        return <InfoIcon className="w-6 h-6 text-gray-600" />;
    }
  };

  const getResponseColor = () => {
    switch (response.type) {
      case 'plan_proposal':
        return 'border-blue-200 bg-blue-50';
      case 'pr_created':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'confirmation_required':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const renderPlanProposal = (plan: AgentPlan) => (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{plan.title}</h3>
          <Badge className="bg-blue-100 text-blue-800">
            {Math.round(plan.confidence * 100)}% confidence
          </Badge>
        </div>
        <p className="text-gray-700 mb-4">{plan.description}</p>
        
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Implementation Steps:</h4>
          {plan.steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-sm font-medium flex items-center justify-center flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{step.title}</h5>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Confidence: {Math.round(step.confidence * 100)}%</span>
                  {step.estimatedDuration && (
                    <span>Est. {Math.round(step.estimatedDuration / 60)}min</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {plan.estimatedDuration && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Estimated total duration:</strong> {Math.round(plan.estimatedDuration / 60)} minutes
            </p>
          </div>
        )}
      </div>

      {/* Plan Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            onClick={handlePlanApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckIcon className="w-4 h-4 mr-2" />
            Approve & Execute
          </Button>
          <Button
            onClick={() => setShowModifyForm(!showModifyForm)}
            variant="outline"
            disabled={isSubmitting}
          >
            <EditIcon className="w-4 h-4 mr-2" />
            Request Modifications
          </Button>
        </div>
      </div>

      {/* Modification Form */}
      {showModifyForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Request Plan Modifications</h4>
          <Textarea
            value={modifications}
            onChange={(e) => setModifications(e.target.value)}
            placeholder="Describe what changes you'd like to the plan..."
            rows={3}
            className="mb-3"
          />
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePlanModify}
              disabled={!modifications.trim() || isSubmitting}
              size="sm"
            >
              Submit Modifications
            </Button>
            <Button
              onClick={() => {
                setShowModifyForm(false);
                setModifications('');
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPRCreated = (prData: any) => (
    <div className="space-y-4">
      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
        <div className="flex items-center space-x-3 mb-3">
          <CheckIcon className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-900">Pull Request Created</h3>
        </div>
        <p className="text-green-800 mb-4">{response.message}</p>
        
        {prData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-900">PR #{prData.number}</span>
              <Badge className="bg-green-100 text-green-800">{prData.status || 'Open'}</Badge>
            </div>
            <p className="text-sm text-green-800">{prData.title}</p>
            {prData.url && (
              <a
                href={prData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
              >
                View on GitHub
                <ExternalLinkIcon className="w-4 h-4 ml-1" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderError = () => (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
      <div className="flex items-center space-x-3 mb-3">
        <AlertCircleIcon className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-red-900">Error Occurred</h3>
      </div>
      <p className="text-red-800 mb-4">{response.message}</p>
      
      {response.data?.error && (
        <div className="bg-red-100 border border-red-200 rounded p-3">
          <pre className="text-sm text-red-900 whitespace-pre-wrap">
            {response.data.error}
          </pre>
        </div>
      )}
    </div>
  );

  const renderDefaultResponse = () => (
    <div className="space-y-4">
      <div className={`border rounded-lg p-4 ${getResponseColor()}`}>
        <div className="flex items-center space-x-3 mb-3">
          {getResponseIcon()}
          <h3 className="font-semibold text-gray-900">{response.title}</h3>
        </div>
        <p className="text-gray-800">{response.message}</p>
      </div>

      {response.requiresResponse && (
        <div className="space-y-3">
          <Textarea
            value={userResponse}
            onChange={(e) => setUserResponse(e.target.value)}
            placeholder="Type your response..."
            rows={3}
          />
          <div className="flex items-center justify-end space-x-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmitResponse()}
              disabled={!userResponse.trim() || isSubmitting}
            >
              Send Response
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderResponseContent = () => {
    switch (response.type) {
      case 'plan_proposal':
        return response.data?.plan ? renderPlanProposal(response.data.plan) : renderDefaultResponse();
      case 'pr_created':
        return renderPRCreated(response.data);
      case 'error':
        return renderError();
      default:
        return renderDefaultResponse();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {getResponseIcon()}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Response</h2>
            <p className="text-sm text-gray-500">
              {agentRun.target} • {new Date(response.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm">
          <XIcon className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {renderResponseContent()}
      </div>

      {!response.requiresResponse && response.type !== 'plan_proposal' && (
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default AgentRunResponseModal;

