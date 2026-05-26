export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  push: (message: string, type?: ToastType) => void;
}

export type ToastType = 'error' | 'success' | 'info' | 'warning';
