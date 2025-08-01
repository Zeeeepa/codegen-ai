import React, { useState } from 'react';
import type { GlobalSettings } from '../../types';
import { Modal, Button, Input, Spinner } from '../ui';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../icons';
import { verifyCodegenToken } from '../../services/codegen_library';
import { verifyGithubToken } from '../../services/github_service';
import { verifyGeminiApiKey } from '../../services/web-eval-agent_library';
import { verifyCloudflareToken } from '../../services/cloudflare_service';


interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

const SETTING_DEFINITIONS = [
    { key: 'CODEGEN_ORG_ID', label: 'Codegen Org ID', group: 'Codegen Agent API' },
    { key: 'CODEGEN_API_TOKEN', label: 'Codegen API Token', isSecret: true, group: 'Codegen Agent API' },
    { key: 'GITHUB_TOKEN', label: 'GitHub Token', isSecret: true, group: 'GitHub Usage' },
    { key: 'GEMINI_API_KEY', label: 'Gemini API Key', isSecret: true, group: 'Web-Eval-Agent' },
    { key: 'CLOUDFLARE_API_KEY', label: 'Cloudflare API Key', isSecret: true, group: 'Cloudflare Access' },
    { key: 'CLOUDFLARE_ACCOUNT_ID', label: 'Cloudflare Account ID', group: 'Cloudflare Access' },
    { key: 'CLOUDFLARE_WORKER_NAME', label: 'Cloudflare Worker Name', group: 'Cloudflare Access' },
    { key: 'CLOUDFLARE_WORKER_URL', label: 'Cloudflare Worker URL', group: 'Cloudflare Access' },
];

const SettingInput: React.FC<{
    label: string;
    value: string;
    isSecret?: boolean;
    onChange: (value: string) => void;
}> = ({ label, value, isSecret, onChange }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const id = `global-setting-${label.replace(/ /g, '-')}`;

    return (
        <div className="relative">
            <Input
                id={id}
                label={label}
                value={value}
                onChange={e => onChange(e.target.value)}
                type={isSecret && !isRevealed ? 'password' : 'text'}
                className="font-mono pr-10"
            />
            {isSecret && (
                <button
                    type="button"
                    onClick={() => setIsRevealed(!isRevealed)}
                    className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-gray-400 hover:text-white"
                    aria-label={isRevealed ? 'Hide secret' : 'Show secret'}
                >
                    {isRevealed ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
            )}
        </div>
    );
};

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, settings: initialSettings, onSave }) => {
  const [currentSettings, setCurrentSettings] = useState<GlobalSettings>(initialSettings);
  const [verificationStatus, setVerificationStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});


  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  const handleSettingChange = (key: string, value: string) => {
    setCurrentSettings(prev => ({ ...prev, [key]: value }));
    const group = SETTING_DEFINITIONS.find(s => s.key === key)?.group;
    if (group && verificationStatus[group] !== 'idle') {
        setVerificationStatus(prev => ({...prev, [group]: 'idle'}));
    }
  };

  const handleVerify = async (groupName: string) => {
    setVerificationStatus(prev => ({ ...prev, [groupName]: 'loading' }));
    let success = false;
    try {
        switch (groupName) {
            case 'Codegen Agent API':
                success = await verifyCodegenToken(currentSettings.CODEGEN_ORG_ID, currentSettings.CODEGEN_API_TOKEN);
                break;
            case 'GitHub Usage':
                success = await verifyGithubToken(currentSettings.GITHUB_TOKEN);
                break;
            case 'Web-Eval-Agent':
                success = await verifyGeminiApiKey(currentSettings.GEMINI_API_KEY);
                break;
            case 'Cloudflare Access':
                success = await verifyCloudflareToken(currentSettings.CLOUDFLARE_API_KEY, currentSettings.CLOUDFLARE_ACCOUNT_ID);
                break;
        }
    } catch {
        success = false;
    }
    setVerificationStatus(prev => ({ ...prev, [groupName]: success ? 'success' : 'error' }));
  };

  const groupedSettings = SETTING_DEFINITIONS.reduce((acc, setting) => {
    const group = setting.group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(setting);
    return acc;
  }, {} as Record<string, typeof SETTING_DEFINITIONS>);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Global Environment Settings"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
        <div className="space-y-6">
            {Object.entries(groupedSettings).map(([groupName, settings]) => (
                <div key={groupName}>
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
                        <h4 className="text-md font-semibold text-gray-300">{groupName}</h4>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerify(groupName)}
                            disabled={verificationStatus[groupName] === 'loading'}
                            className="w-24 justify-center"
                        >
                            {verificationStatus[groupName] === 'loading' && <Spinner className="w-4 h-4" />}
                            {verificationStatus[groupName] === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                            {verificationStatus[groupName] === 'error' && <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />}
                            {(!verificationStatus[groupName] || verificationStatus[groupName] === 'idle') && 'Verify'}
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {settings.map(({ key, label, isSecret }) => (
                            <SettingInput
                                key={key}
                                label={label}
                                value={currentSettings[key] || ''}
                                isSecret={isSecret}
                                onChange={(value) => handleSettingChange(key, value)}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </Modal>
  );
};