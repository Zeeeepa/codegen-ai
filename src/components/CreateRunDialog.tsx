/**
 * Create Run Dialog Component
 * Modal dialog for creating new agent runs with form validation
 */

import React, { useState } from 'react';
import { CreateAgentRun } from '../create-agent-run';
import { Modal, Button } from './ui';
import { XIcon } from './icons';
import type { AgentRun } from '../hooks/useCachedAgentRuns';

interface CreateRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  repositoryId?: string;
  onAgentRunCreated?: (agentRun: AgentRun) => void;
  initialTarget?: string;
}

export const CreateRunDialog: React.FC<CreateRunDialogProps> = ({
  isOpen,
  onClose,
  organizationId,
  repositoryId,
  onAgentRunCreated,
  initialTarget
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleAgentRunCreated = (agentRun: AgentRun) => {
    setIsCreating(false);
    onAgentRunCreated?.(agentRun);
    onClose();
  };

  const handleCancel = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Create Agent Run</h2>
        <Button
          onClick={handleCancel}
          variant="ghost"
          size="sm"
          disabled={isCreating}
          className="text-gray-400 hover:text-gray-600"
        >
          <XIcon className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-h-[80vh] overflow-y-auto">
        <CreateAgentRun
          organizationId={organizationId}
          onAgentRunCreated={handleAgentRunCreated}
          onCancel={handleCancel}
          initialValues={{
            repositoryId,
            target: initialTarget || ''
          }}
          showRepositorySelector={!repositoryId}
        />
      </div>
    </Modal>
  );
};

export default CreateRunDialog;

