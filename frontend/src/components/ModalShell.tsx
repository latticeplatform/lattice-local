import { useEffect, type FC, type ReactNode, type PropsWithChildren } from 'react';
import './ModalShell.css';

interface ModalShellProps extends PropsWithChildren {
  label?: string;
  title: ReactNode;
  headerActions?: ReactNode;
  panel?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  footerSplit?: boolean;
  wide?: boolean;
}

const ModalShell: FC<ModalShellProps> = ({
  label, title, headerActions, panel, onClose,
  footer, footerSplit = false, wide = false, children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className={`connector-modal${wide ? ' connector-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <div className="modal-header-actions">
            {headerActions}
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        {panel}
        <div className="modal-body">{children}</div>
        {footer != null && (
          <div className={`modal-footer${footerSplit ? ' modal-footer--split' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default ModalShell;