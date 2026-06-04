import { useContext } from 'react';
import { ModalContext } from '../context/ModalContext.tsx';

const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};

export default useModal;
