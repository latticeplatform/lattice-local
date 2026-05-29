import { useState, type FC } from 'react';
import type { TopicGroup } from '../../types';
import ModalShell from './ModalShell.tsx';
import useToast from '../../hooks/useToast.ts';
import useConnect from '../../hooks/useConnect.ts';
import DetailSection from '../DetailSection.tsx';

interface TopicGroupFormProps {
  editingGroup: TopicGroup | null;
  availableTopics: string[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  topics: string[];
}

const TopicGroupForm: FC<TopicGroupFormProps> = ({
  editingGroup,
  availableTopics,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(
    editingGroup
      ? { name: editingGroup.name, topics: [...editingGroup.topics] }
      : { name: '', topics: [] }
  );
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const toast = useToast();
  const { dispatch } = useConnect();

  const toggleTopic = (topic: string) => {
    setForm((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (editingGroup) {
        await dispatch({
          type: 'TOPIC_UPDATE_GROUP',
          oldName: editingGroup.name,
          name: form.name.trim(),
          topics: form.topics,
        });
      } else {
        await dispatch({ type: 'TOPIC_CREATE_GROUP', name: form.name.trim(), topics: form.topics });
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to save group');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editingGroup) return;
    setBusy(true);
    try {
      await dispatch({ type: 'TOPIC_DELETE_GROUP', name: editingGroup.name });
      onSaved();
      onClose();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to delete group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      label={editingGroup ? `Edit ${editingGroup.name}` : 'New Topic Group'}
      title={editingGroup ? `Edit ${editingGroup.name}` : 'New Topic Group'}
      onClose={onClose}
      footerSplit={!!editingGroup}
      footer={
        <>
          {editingGroup && (
            <div className="detail-footer-left">
              {pendingDelete ? (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={() => void handleDelete()}
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
          )}
          <div className="detail-footer-right">
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void handleSubmit()}
              disabled={busy || !form.name.trim()}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      }
    >
      <DetailSection title={'Name'}>
        <input
          className="group-name-input"
          type="text"
          value={form.name}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, name: e.target.value }));
          }}
          placeholder="Group name"
        />
      </DetailSection>

      <DetailSection title={`Topics (${String(form.topics.length)} selected)`}>
        <p className="detail-section-title"></p>
        {availableTopics.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text)' }}>No topics available</span>
        ) : (
          <div className="group-topics-list">
            {availableTopics.map((topic) => (
              <label key={topic} className="group-topic-row">
                <input
                  type="checkbox"
                  checked={form.topics.includes(topic)}
                  onChange={() => {
                    toggleTopic(topic);
                  }}
                />
                <span>{topic}</span>
              </label>
            ))}
          </div>
        )}
      </DetailSection>

    </ModalShell>
  );
};

export default TopicGroupForm;
