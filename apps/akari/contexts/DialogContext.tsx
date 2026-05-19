import React, { createContext, use, useCallback, useMemo, useRef, useState } from 'react';

type DialogComponent = React.ReactNode;

export type DialogOpenOptions = {
  id: string;
  component: DialogComponent;
  onClosed?: () => void;
};

export type DialogManager = {
  open: (options: DialogOpenOptions) => void;
  close: (id: string) => void;
  closeAll: () => void;
  isOpen: (id: string) => boolean;
};

const DialogContext = createContext<DialogManager | undefined>(undefined);

type DialogInstance = {
  id: string;
  element: DialogComponent;
};

type DialogProviderProps = {
  children: React.ReactNode;
};

export function DialogProvider({ children }: DialogProviderProps) {
  const [dialogs, setDialogs] = useState<DialogInstance[]>([]);
  const onClosedRef = useRef<Map<string, () => void>>(new Map());

  const open = useCallback(({ id, component, onClosed }: DialogOpenOptions) => {
    if (onClosed) {
      onClosedRef.current.set(id, onClosed);
    } else {
      onClosedRef.current.delete(id);
    }

    setDialogs((current) => {
      const existingIndex = current.findIndex((dialog) => dialog.id === id);

      if (existingIndex !== -1) {
        const updated = [...current];
        updated[existingIndex] = { id, element: component };
        return updated;
      }

      return [...current, { id, element: component }];
    });
  }, []);

  const close = useCallback((id: string) => {
    const callback = onClosedRef.current.get(id);
    onClosedRef.current.delete(id);
    setDialogs((current) => current.filter((dialog) => dialog.id !== id));
    callback?.();
  }, []);

  const closeAll = useCallback(() => {
    const callbacks = Array.from(onClosedRef.current.values());
    onClosedRef.current.clear();
    setDialogs([]);
    for (const callback of callbacks) {
      callback();
    }
  }, []);

  const isOpen = useCallback(
    (id: string) => dialogs.some((dialog) => dialog.id === id),
    [dialogs],
  );

  const value = useMemo(
    () => ({
      open,
      close,
      closeAll,
      isOpen,
    }),
    [open, close, closeAll, isOpen],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialogs.map((dialog) => (
        <React.Fragment key={dialog.id}>{dialog.element}</React.Fragment>
      ))}
    </DialogContext.Provider>
  );
}

export function useDialogManager(): DialogManager {
  const context = use(DialogContext);

  if (!context) {
    throw new Error('useDialogManager must be used within a DialogProvider');
  }

  return context;
}
