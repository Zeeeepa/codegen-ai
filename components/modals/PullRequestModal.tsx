import React, { useState } from 'react';
import type { Project, PullRequest as PR_TYPE, GlobalSettings } from '../../types';
import { AgentRunStatus } from '../../types';
import { Modal, Button, Spinner, Card } from '../ui';
import { PlayIcon, CodeIcon, GitMergeIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '../icons';
import { ViewDiffModal } from './ViewDiffModal';
import { getPullRequestDiff, closePullRequest, mergePullRequest } from '../../services/github_service';

interface PullRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  globalSettings: GlobalSettings;
  onUpdateProject: (updatedProject: Project | ((p: Project) => Project)) => void;
}

const getValidationStatusInfo = (status: PR_TYPE['validationStatus']): { color: string; Icon: React.FC<{className?:string}>; text: string } => {
    switch(status) {
        case 'idle': return { color: 'text-gray-400', Icon: InformationCircleIcon, text: 'Idle' };
        case 'running': return { color: 'text-blue-400', Icon: Spinner, text: 'Validating...' };
        case 'success': return { color: 'text-green-400', Icon: CheckCircleIcon, text: 'Success' };
        case 'failed': return { color: 'text-red-400', Icon: ExclamationTriangleIcon, text: 'Failed' };
        default: return { color: 'text-gray-500', Icon: InformationCircleIcon, text: 'Unknown' };
    }
};

const PullRequestRow: React.FC<{
    pr: PR_TYPE;
    project: Project;
    onClose: () => void;
    onUpdateProject: (updateFn: (p: Project) => Project) => void;
    onRemovePR: (prId: number) => void;
}> = ({ pr, project, onClose, onUpdateProject, onRemovePR }) => {
    const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
    const [diffContent, setDiffContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { Icon, color, text } = getValidationStatusInfo(pr.validationStatus);

    const handleValidate = () => {
        onUpdateProject(p => ({
            ...p,
            pullRequests: p.pullRequests.map(pull => pull.id === pr.id ? { ...pull, validationStatus: 'running' } : pull),
            agentRun: {
                ...p.agentRun!,
                status: AgentRunStatus.VALIDATING_PR,
                history: [
                    ...(p.agentRun?.history || []),
                    { type: 'status', content: `Queued up validation for PR #${pr.number}.`, timestamp: new Date().toISOString() }
                ]
            }
        }));
        onClose();
    };

    const handleViewDiff = async () => {
        setIsLoading(true);
        const diff = await getPullRequestDiff(project, pr.number);
        setDiffContent(diff);
        setIsDiffModalOpen(true);
        setIsLoading(false);
    };

    const handleMerge = async () => {
        setIsLoading(true);
        const result = await mergePullRequest(project, pr.number);
        if (result.success) {
            onRemovePR(pr.id);
        }
        setIsLoading(false);
    };

    const handleClose = async () => {
        if(window.confirm(`Are you sure you want to close Pull Request #${pr.number}?`)) {
            setIsLoading(true);
            const result = await closePullRequest(project, pr.number);
            if(result.success) {
                onRemovePR(pr.id);
            }
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md hover:bg-gray-900 transition-colors">
                <div className="flex-1 min-w-0">
                    <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-gray-200 hover:text-indigo-400">
                        #{pr.number} {pr.title}
                    </a>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>by {pr.user.login}</span>
                        <span className="mx-1">&middot;</span>
                        <Icon className={`w-4 h-4 ${pr.validationStatus === 'running' ? 'animate-spin' : ''} ${color}`} />
                        <span className={color}>{text}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button size="sm" variant="secondary" onClick={handleValidate} disabled={isLoading || pr.validationStatus !== 'idle'} title="Validate"><PlayIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="secondary" onClick={handleViewDiff} disabled={isLoading} title="View Diff"><CodeIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="primary" onClick={handleMerge} disabled={pr.validationStatus !== 'success' || isLoading} title="Merge"><GitMergeIcon className="w-4 h-4" /></Button>
                    <Button size="sm" variant="danger" onClick={handleClose} disabled={isLoading} title="Close Pull Request"><TrashIcon className="w-4 h-4" /></Button>
                </div>
            </div>
            <ViewDiffModal isOpen={isDiffModalOpen} onClose={() => setIsDiffModalOpen(false)} diffContent={diffContent} prTitle={`#${pr.number}`} />
        </>
    );
};


export const PullRequestModal: React.FC<PullRequestModalProps> = ({ isOpen, onClose, project, globalSettings, onUpdateProject }) => {

    const removePullRequest = (prId: number) => {
        onUpdateProject(p => ({...p, pullRequests: p.pullRequests.filter(pr => pr.id !== prId)}));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Pull Requests for ${project.name}`}
            footer={
                <Button variant="secondary" onClick={onClose}>Close</Button>
            }
        >
            <div className="space-y-3">
                {project.pullRequests.length > 0 ? (
                    project.pullRequests.map(pr => (
                        <PullRequestRow 
                            key={pr.id} 
                            pr={pr}
                            project={project}
                            onClose={onClose}
                            onUpdateProject={onUpdateProject} 
                            onRemovePR={removePullRequest} 
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No open pull requests found.
                    </div>
                )}
            </div>
        </Modal>
    );
};