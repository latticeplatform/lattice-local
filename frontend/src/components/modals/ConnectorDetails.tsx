import { useState, type FC } from 'react';
import type { ConnectorEntry } from '../../types';
import { useToast } from '../../context/ToastContext.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import ModalShell from './ModalShell.tsx';
import './ConnectorDetails.css';
import StatusRow from '../StatusRow.tsx';
import ConfigDetailRow from '../ConfigDetailRow.tsx';
import TaskDisplay from '../TaskDisplay.tsx';
import DetailSection from '../DetailSection.tsx';

interface ConnectorDetailsProps {
  entry: ConnectorEntry;
  onClose: () => void;
}

const ConnectorDetails: FC<ConnectorDetailsProps> = ({ entry, onClose }) => {
  const [localEntry, setLocalEntry] = useState(entry);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { dispatch, refresh } = useConnect();

  const { connector, tasks, type } = localEntry.status;
  const configEntries = Object.entries(localEntry.info.config).filter(
    ([k]) => k !== 'connector.class'
  );
  const isPaused = connector.state === 'PAUSED';
  const name = localEntry.info.name;

  const runAndClose = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      refresh();
      onClose();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setBusy(true);
    try {
      await dispatch({ type: 'CONNECTOR_RESTART', name });
      const refreshed = await dispatch({ type: 'CONNECTOR_FETCH', name });
      setLocalEntry(refreshed);
      refresh();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Restart failed');
    } finally {
      setBusy(false);
    }
  };


  return (
    <ModalShell
      label={name}
      title={
        <div className="detail-header-left">
          <h2 className="detail-header-title">{name}</h2>
          <span className="badge">{type}</span>
        </div>
      }
      onClose={onClose}
      wide
      footerSplit
      footer={
        <>
          <div className="detail-footer-left">
            {pendingDelete ? (
              <>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    void runAndClose(() => dispatch({ type: 'CONNECTOR_REMOVE', name }))
                  }
                  disabled={busy}
                >
                  Confirm Delete
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setPendingDelete(false);
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn btn-danger"
                onClick={() => {
                  setPendingDelete(true);
                }}
                disabled={busy}
              >
                Delete
              </button>
            )}
          </div>
          <div className="detail-footer-right">
            <button className="btn btn-ghost" onClick={() => void handleRestart()} disabled={busy}>
              {busy ? 'Restarting…' : 'Restart'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() =>
                void runAndClose(() =>
                  isPaused
                    ? dispatch({ type: 'CONNECTOR_RESUME', name })
                    : dispatch({ type: 'CONNECTOR_PAUSE', name })
                )
              }
              disabled={busy}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </>
      }
    >
      <DetailSection title={'Connector'}>
        <StatusRow state={connector.state} workerId={connector.worker_id} />
      </DetailSection>

      {tasks.length > 0 &&
        <DetailSection title={`Tasks (${String(tasks.length)})`}>
          {tasks.map((task) => (
            <TaskDisplay key={task.id} task={task} connectorName={localEntry.info.name} />
          ))}
        </DetailSection>
      }

      <DetailSection title={`Config (${String(configEntries.length)} keys)`}>
        <div className="detail-config">
          {configEntries.map(([key, value]) => (
            <ConfigDetailRow key={key} name={key} value={value}/>
          ))}
        </div>
      </DetailSection>
    </ModalShell>
  );
};

export default ConnectorDetails;
