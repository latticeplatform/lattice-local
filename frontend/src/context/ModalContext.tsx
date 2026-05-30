import { createContext } from 'react';

export type ModalState =
  | { kind: 'connector-details'; name: string }
  | { kind: 'connector-form'; pluginClass: string }
  | { kind: 'topic-details'; name: string; sourceConnector: string }
  | null;

export interface ModalContextValue {
  modal: ModalState;
  open: (modal: NonNullable<ModalState>) => void;
  close: () => void;
}

export const ModalContext = createContext<ModalContextValue | null>(null);
