
import React, { useState } from 'react';
import type { Project } from '../../types';
import { Modal, Textarea, Button, Spinner } from '../ui';

interface AgentRunModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (target: string) => Promise<void>;
}

export const AgentRunModal: React.FC<AgentRunModalProps> = ({ project, isOpen, onClose, onConfirm }) => {
  const [target, setTarget] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleConfirm = async () => {
    if (!target.trim()) return;
    setIsRunning(true);
    await onConfirm(target);
    setIsRunning(false);
    setTarget('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Run Agent on ${project.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isRunning}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!target.trim() || isRunning}>
            {isRunning ? <Spinner /> : 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-400">
          Enter the target or goal for the AI agent. This will be combined with the project's planning statement and rules.
        </p>
        <Textarea
          id="agent-target"
          label="Target / Goal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="e.g., 'Implement user authentication using Firebase Auth' or 'Refactor the API service to use async/await'."
          rows={6}
          disabled={isRunning}
        />
      </div>
    </Modal>
  );
};
