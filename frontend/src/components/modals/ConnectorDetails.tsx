import { useState, type FC } from 'react';
import type { ConnectorEntry } from '../../types';
import { useToast } from '../../context/ToastContext.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import ModalShell from './ModalShell.tsx';
import './ConnectorDetails.css';
import StatusRow from '../StatusRow.tsx';

interface ConnectorDetailsProps {
  entry: ConnectorEntry;
  onClose: () => void;
}

const SENSITIVE_KEYS = /password|secret|credential|token|api[._-]?key/i;

const maskIfSensitive = (key: string, value: string): string => {
  return SENSITIVE_KEYS.test(key) ? '••••••' : value;
};

const ConnectorDetails: FC<ConnectorDetailsProps> = ({ entry, onClose }) => {
  const [localEntry, setLocalEntry] = useState(entry);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restartingTaskId, setRestartingTaskId] = useState<number | null>(null);
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

  const handleTaskRestart = async (taskId: number) => {
    setRestartingTaskId(taskId);
    try {
      await dispatch({ type: 'CONNECTOR_RESTART_TASK', name, taskId });
      const refreshed = await dispatch({ type: 'CONNECTOR_FETCH', name });
      setLocalEntry(refreshed);
      refresh();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : `Task ${String(taskId)} restart failed`);
    } finally {
      setRestartingTaskId(null);
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
      <div className="detail-section">
        <p className="detail-section-title">Connector</p>
        <StatusRow state={connector.state} workerId={connector.worker_id} />
      </div>

      {tasks.length > 0 && (
        <div className="detail-section">
          <p className="detail-section-title">Tasks ({tasks.length})</p>
          {tasks.map((task) => {
            const isRestarting = restartingTaskId === task.id;
            const isDisabled = busy || restartingTaskId !== null;
            return (
              <div key={task.id} className="detail-task-row">
                <span className="detail-task-id">#{task.id}</span>
                <StatusRow state={task.state} workerId={task.worker_id} />
                <button
                  className="detail-task-restart"
                  onClick={() => void handleTaskRestart(task.id)}
                  disabled={isDisabled}
                  title={`Restart task ${String(task.id)}`}
                >
                  {isRestarting ? 'Restarting…' : 'Restart'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="detail-section">
        <p className="detail-section-title">Config ({configEntries.length} keys)</p>
        <div className="detail-config">
          {configEntries.map(([key, value]) => (
            <div key={key} className="detail-config-row">
              <span className="detail-config-key">{key}</span>
              <span className="detail-config-value">{maskIfSensitive(key, value)}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

export default ConnectorDetails;
