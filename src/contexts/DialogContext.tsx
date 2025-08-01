import React, { createContext, useContext, useState, ReactNode } from 'react';

type DialogType = 'resume-run' | 'create-run' | 'settings';

interface DialogContextType {
  openDialog: (type: DialogType, data?: any) => void;
  closeDialog: () => void;
  isDialogOpen: (type: DialogType) => boolean;
  dialogData: any;
  currentDialog: DialogType | null;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [currentDialog, setCurrentDialog] = useState<DialogType | null>(null);
  const [dialogData, setDialogData] = useState<any>(null);

  const openDialog = (type: DialogType, data?: any) => {
    setCurrentDialog(type);
    setDialogData(data);
  };

  const closeDialog = () => {
    setCurrentDialog(null);
    setDialogData(null);
  };

  const isDialogOpen = (type: DialogType) => {
    return currentDialog === type;
  };

  const value: DialogContextType = {
    openDialog,
    closeDialog,
    isDialogOpen,
    dialogData,
    currentDialog,
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

