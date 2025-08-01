import React, { useState, useEffect } from 'react';
import type { Project, ProjectSettings } from '../../types';
import { Modal, Textarea, Button, Tabs, Input, Select, Checkbox, Card, Spinner } from '../ui';
import { getRepoBranches } from '../../services/github_service';
import { BranchIcon, PlusIcon, TrashIcon } from '../icons';

interface SettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ProjectSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ project, isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<ProjectSettings>(project.settings);
  const [branches, setBranches] = useState<string[]>([]);
  
  // State for running setup commands
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [runLog, setRunLog] = useState('');

  // State for adding a new secret
  const [isAddingSecret, setIsAddingSecret] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSettings(project.settings);
      getRepoBranches(project.full_name).then(setBranches);
    } else {
      // Reset temporary states when modal is closed
      setRunStatus('idle');
      setRunLog('');
      setIsAddingSecret(false);
      setNewSecretKey('');
      setNewSecretValue('');
    }
  }, [isOpen, project]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleSecretValueChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, secrets: { ...prev.secrets, [key]: value } }));
  };

  const handleRemoveSecret = (key: string) => {
    const newSecrets = { ...settings.secrets };
    delete newSecrets[key];
    setSettings(prev => ({ ...prev, secrets: newSecrets }));
  };

  const handleShowAddSecretForm = () => {
    setIsAddingSecret(true);
  };

  const handleCancelAddSecret = () => {
    setIsAddingSecret(false);
    setNewSecretKey('');
    setNewSecretValue('');
  };

  const handleConfirmAddSecret = () => {
    const key = newSecretKey.trim();
    if (key && !settings.secrets.hasOwnProperty(key)) {
        setSettings(prev => ({
            ...prev,
            secrets: { ...prev.secrets, [key]: newSecretValue }
        }));
        handleCancelAddSecret();
    } else {
        alert('Secret key cannot be empty and must be unique.');
    }
  };
  
  const handleRunCommands = async () => {
    setRunStatus('running');
    setRunLog(`> Running setup commands on branch: ${settings.branch}...\n\n${settings.setupCommands}`);
    await new Promise(res => setTimeout(res, 2500)); // simulate run
    const success = Math.random() > 0.4; // 60% chance of success
    if (success) {
        setRunStatus('success');
        setRunLog(prev => prev + '\n\n✅ Commands executed successfully.');
    } else {
        setRunStatus('failed');
        setRunLog(prev => prev + '\n\n❌ Command failed: `npm run dev` exited with code 1.\nError: Port 3000 is already in use.');
    }
  };

  const tabs = [
    { name: 'Repository Rules', content: (
        <Textarea
          label="Specify any additional rules you want the agent to follow for this repository."
          value={settings.rules}
          onChange={(e) => setSettings(s => ({ ...s, rules: e.target.value }))}
          rows={10}
          placeholder="e.g., 'Always use functional components with hooks.' or 'All CSS must be done via Tailwind CSS classes.'"
        />
      ) 
    },
    { name: 'Planning Statement', content: (
        <Textarea
          label="This text is sent to the AI agent along with your target from the 'Run Agent' dialog."
          value={settings.planningStatement}
          onChange={(e) => setSettings(s => ({ ...s, planningStatement: e.target.value }))}
          rows={10}
          placeholder="e.g., 'You are an expert React developer. Your task is to implement the following feature with clean, maintainable, and well-documented code.'"
        />
      ) 
    },
    { name: 'Setup Commands', content: (
        <div className="space-y-4">
            <Textarea
              label="Specify the commands to run when setting up the sandbox environment."
              value={settings.setupCommands}
              onChange={(e) => setSettings(s => ({ ...s, setupCommands: e.target.value }))}
              rows={6}
              placeholder={'cd backend\npython api.py\n\ncd ../frontend\nnpm install\nnpm run dev'}
              className="font-mono text-sm"
            />
            <Select 
                label="Branch"
                value={settings.branch}
                onChange={(e) => setSettings(s => ({ ...s, branch: e.target.value }))}
            >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </Select>
            <div className="flex justify-end items-center gap-3">
                {runStatus === 'running' && <Spinner className="w-5 h-5" />}
                {runStatus === 'success' && <span className="text-sm text-green-400">Success!</span>}
                {runStatus === 'failed' && <span className="text-sm text-red-400">Failed</span>}
                <Button variant="secondary" onClick={handleRunCommands} disabled={runStatus === 'running'}>
                    <BranchIcon className="w-4 h-4 mr-2" />
                    Run Commands on Branch
                </Button>
            </div>
            {runLog && (
                <div className="mt-4 p-3 bg-black/30 rounded-md font-mono text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {runLog}
                </div>
            )}
        </div>
      )
    },
    { name: 'Secrets', content: (
        <div className="space-y-4">
            {Object.entries(settings.secrets).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                    <Input value={key} readOnly className="font-mono bg-gray-900 flex-grow"/>
                    <Input type="password" value={value} onChange={e => handleSecretValueChange(key, e.target.value)} className="font-mono flex-grow"/>
                    <Button variant="danger" onClick={() => handleRemoveSecret(key)} className="p-2 flex-shrink-0">
                        <TrashIcon className="w-5 h-5"/>
                    </Button>
                </div>
            ))}
            
            {isAddingSecret && (
                <Card className="p-4 bg-gray-900/70">
                    <div className="space-y-3">
                        <Input 
                            placeholder="ENV_VAR_NAME"
                            value={newSecretKey}
                            onChange={e => setNewSecretKey(e.target.value.toUpperCase().replace(/ /g, '_'))}
                            className="font-mono"
                        />
                        <Input 
                            type="password"
                            placeholder="Value"
                            value={newSecretValue}
                            onChange={e => setNewSecretValue(e.target.value)}
                            className="font-mono"
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={handleCancelAddSecret}>Cancel</Button>
                            <Button onClick={handleConfirmAddSecret}>Confirm Secret</Button>
                        </div>
                    </div>
                </Card>
            )}

            {!isAddingSecret && (
                <Button variant="secondary" onClick={handleShowAddSecretForm}>
                    <PlusIcon className="w-4 h-4 mr-2"/>
                    Add Secret
                </Button>
            )}
        </div>
      ) 
    },
    { name: 'Automation', content: (
        <div className="space-y-4 p-2 rounded-md bg-gray-900/50">
            <Checkbox
                id="auto-confirm"
                label="Auto Confirm Proposed Plan"
                checked={settings.autoConfirmPlan}
                onChange={(e) => setSettings(s => ({
                    ...s, 
                    autoConfirmPlan: e.target.checked,
                    autoConfirmPlanEnabledAt: e.target.checked ? new Date().toISOString() : undefined
                }))}
            />
            <p className="text-sm text-gray-400 pl-7">
                Automatically approve and execute plans generated by the AI agent without manual confirmation.
            </p>
            <Checkbox
                id="auto-validate"
                label="Auto-Validate New PRs"
                checked={settings.autoValidatePRs}
                onChange={(e) => setSettings(s => ({ 
                    ...s, 
                    autoValidatePRs: e.target.checked,
                    autoValidatePRsEnabledAt: e.target.checked ? new Date().toISOString() : undefined
                }))}
            />
             <p className="text-sm text-gray-400 pl-7">
                Automatically start the validation flow when a new PR is detected for this project.
            </p>
            <Checkbox
                id="auto-merge"
                label="Auto-merge Validated PR"
                checked={settings.autoMergePR}
                onChange={(e) => setSettings(s => ({
                    ...s, 
                    autoMergePR: e.target.checked,
                    autoMergePREnabledAt: e.target.checked ? new Date().toISOString() : undefined
                }))}
            />
            <p className="text-sm text-gray-400 pl-7">
                Automatically merge pull requests to the main branch after they have passed all validation and testing steps.
            </p>
        </div>
      )
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Settings for ${project.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      <Tabs tabs={tabs} />
    </Modal>
  );
};