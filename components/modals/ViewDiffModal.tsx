
import React from 'react';
import { Modal, Button } from '../ui';

interface ViewDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffContent: string;
  prTitle: string;
}

const DiffLine: React.FC<{ line: string }> = ({ line }) => {
    let color = 'text-gray-300';
    if (line.startsWith('+')) {
        color = 'text-green-400';
    } else if (line.startsWith('-')) {
        color = 'text-red-400';
    } else if (line.startsWith('@@')) {
        color = 'text-cyan-400';
    }
    return <div className={color}>{line}</div>
};

export const ViewDiffModal: React.FC<ViewDiffModalProps> = ({ isOpen, onClose, diffContent, prTitle }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Diff for: ${prTitle}`}
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <div className="bg-black/50 p-4 rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
        {diffContent.split('\n').map((line, index) => (
          <DiffLine key={index} line={line} />
        ))}
      </div>
    </Modal>
  );
};