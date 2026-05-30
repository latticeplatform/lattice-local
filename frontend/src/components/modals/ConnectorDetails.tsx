import { useState, type FC } from 'react';
import useToast from '../../hooks/useToast.ts';
import useConnect from '../../hooks/useConnect.ts';
import ModalShell from './ModalShell.tsx';
import './ConnectorDetails.css';
import StatusRow from '../StatusRow.tsx';
import ConfigDetailRow from '../ConfigDetailRow.tsx';
import TaskDisplay from '../TaskDisplay.tsx';
import DetailSection from '../DetailSection.tsx';

interface ConnectorDetailsProps {
  name: string;
  onClose: () => void;
}

const ConnectorDetails: FC<ConnectorDetailsProps> = ({ name, onClose }) => {
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({});
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { collectors, sinks, dispatch, refresh } = useConnect();

  const entry = [...collectors, ...sinks].find((e) => e.info.name === name);
  if (!entry) return null;

  const { connector, tasks, type } = entry.status;
  const configEntries = Object.entries(entry.info.config).filter(
    ([k]) => k !== 'connector.class'
  );
  const isPaused = connector.state === 'PAUSED';
  const hasPendingEdits = Object.keys(pendingEdits).length > 0;

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

  const handleSave = async () => {
    setBusy(true);
    try {
      await dispatch({ type: 'CONNECTOR_PATCH', name, config: pendingEdits });
      setPendingEdits({});
      setEditingKeys(new Set());
      toast.push('Config saved', 'success');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setBusy(true);
    try {
      await dispatch({ type: 'CONNECTOR_RESTART', name });
      await dispatch({ type: 'CONNECTOR_FETCH', name });
      refresh();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Restart failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = (key: string) => {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setPendingEdits((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([oldKey]) => oldKey !== key))
    );
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
            {hasPendingEdits ? (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setPendingEdits({});
                    setEditingKeys(new Set());
                  }}
                  disabled={busy}
                >
                  Discard
                </button>
                <button className="btn btn-coral" onClick={() => void handleSave()} disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-ghost"
                  onClick={() => void handleRestart()}
                  disabled={busy}
                >
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
              </>
            )}
          </div>
        </>
      }
    >
      <DetailSection title={'Connector'}>
        <StatusRow state={connector.state} workerId={connector.worker_id} />
      </DetailSection>

      {tasks.length > 0 && (
        <DetailSection title={`Tasks (${String(tasks.length)})`}>
          {tasks.map((task) => (
            <TaskDisplay key={task.id} task={task} connectorName={name} />
          ))}
        </DetailSection>
      )}

      <DetailSection title={`Config (${String(configEntries.length)} keys)`}>
        <div className="detail-config">
          {configEntries.map(([key, value]) => (
            <ConfigDetailRow
              key={key}
              name={key}
              value={pendingEdits[key] ?? value}
              editable={!entry.autofilled_keys.includes(key)}
              editing={editingKeys.has(key)}
              onChange={(v) => {
                setPendingEdits((prev) => ({ ...prev, [key]: v }));
              }}
              onEditStart={() => {
                setEditingKeys((prev) => new Set([...prev, key]));
              }}
              onEditCancel={() => {
                handleCancelEdit(key);
              }}
            />
          ))}
        </div>
      </DetailSection>
    </ModalShell>
  );
};

export default ConnectorDetails;
