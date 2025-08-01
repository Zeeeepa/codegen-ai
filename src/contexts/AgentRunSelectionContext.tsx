import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CachedAgentRun } from '../api/types';

interface AgentRunSelectionContextType {
  selectedRuns: Set<number>;
  selectedRunsData: CachedAgentRun[];
  selectRun: (runId: number, runData: CachedAgentRun) => void;
  deselectRun: (runId: number) => void;
  toggleRun: (runId: number, runData: CachedAgentRun) => void;
  clearSelection: () => void;
  isSelected: (runId: number) => boolean;
  hasSelection: boolean;
  selectionCount: number;
}

const AgentRunSelectionContext = createContext<AgentRunSelectionContextType | undefined>(undefined);

interface AgentRunSelectionProviderProps {
  children: ReactNode;
}

export function AgentRunSelectionProvider({ children }: AgentRunSelectionProviderProps) {
  const [selectedRuns, setSelectedRuns] = useState<Set<number>>(new Set());
  const [selectedRunsData, setSelectedRunsData] = useState<CachedAgentRun[]>([]);

  const selectRun = (runId: number, runData: CachedAgentRun) => {
    setSelectedRuns(prev => new Set([...prev, runId]));
    setSelectedRunsData(prev => {
      const existing = prev.find(run => run.id === runId);
      if (existing) return prev;
      return [...prev, runData];
    });
  };

  const deselectRun = (runId: number) => {
    setSelectedRuns(prev => {
      const newSet = new Set(prev);
      newSet.delete(runId);
      return newSet;
    });
    setSelectedRunsData(prev => prev.filter(run => run.id !== runId));
  };

  const toggleRun = (runId: number, runData: CachedAgentRun) => {
    if (selectedRuns.has(runId)) {
      deselectRun(runId);
    } else {
      selectRun(runId, runData);
    }
  };

  const clearSelection = () => {
    setSelectedRuns(new Set());
    setSelectedRunsData([]);
  };

  const isSelected = (runId: number) => selectedRuns.has(runId);

  const hasSelection = selectedRuns.size > 0;
  const selectionCount = selectedRuns.size;

  const value: AgentRunSelectionContextType = {
    selectedRuns,
    selectedRunsData,
    selectRun,
    deselectRun,
    toggleRun,
    clearSelection,
    isSelected,
    hasSelection,
    selectionCount,
  };

  return (
    <AgentRunSelectionContext.Provider value={value}>
      {children}
    </AgentRunSelectionContext.Provider>
  );
}

export function useAgentRunSelection() {
  const context = useContext(AgentRunSelectionContext);
  if (context === undefined) {
    throw new Error('useAgentRunSelection must be used within an AgentRunSelectionProvider');
  }
  return context;
}
