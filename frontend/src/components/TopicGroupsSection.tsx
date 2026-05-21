import { useState, useCallback, useEffect, type FC } from 'react';
import type { TopicGroup } from '../types/connect.ts';
import { fetchTopicGroups, createTopicGroup, updateTopicGroup, deleteTopicGroup } from '../api/connectApi.ts';
import ModalShell from './ModalShell.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface TopicGroupsSectionProps {
  availableTopics: string[];
}

interface FormState {
  name: string;
  topics: string[];
}

const TopicGroupsSection: FC<TopicGroupsSectionProps> = ({ availableTopics }) => {
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<TopicGroup | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', topics: [] });
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const toast = useToast();

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await fetchTopicGroups());
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to load topic groups');
    }
  }, [toast]);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ name: '', topics: [] });
    setPendingDelete(false);
    setFormOpen(true);
  };

  const openEdit = (group: TopicGroup) => {
    setEditingGroup(group);
    setForm({ name: group.name, topics: [...group.topics] });
    setPendingDelete(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setPendingDelete(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (editingGroup) {
        await updateTopicGroup(editingGroup.name, form.name.trim(), form.topics);
      } else {
        await createTopicGroup(form.name.trim(), form.topics);
      }
      await loadGroups();
      closeForm();
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
      await deleteTopicGroup(editingGroup.name);
      await loadGroups();
      closeForm();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to delete group');
    } finally {
      setBusy(false);
    }
  };

  const toggleTopic = (topic: string) => {
    setForm(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Topic Groups</h2>
        <button type="button" className="refreshButton" onClick={openCreate}>New Group</button>
      </div>
      {groups.length === 0 ? (
        <div className="empty">No topic groups</div>
      ) : (
        <div className="group-list">
          {groups.map(group => (
            <div key={group.name} className="group-row">
              <span className="group-name">{group.name}</span>
              <span className="group-count">{group.topics.length} topic{group.topics.length !== 1 ? 's' : ''}</span>
              <button className="detail-task-restart" onClick={() => openEdit(group)}>Edit</button>
            </div>
          ))}
        </div>
      )}
      {formOpen && (
        <ModalShell
          label={editingGroup ? `Edit ${editingGroup.name}` : 'New Topic Group'}
          title={editingGroup ? `Edit ${editingGroup.name}` : 'New Topic Group'}
          onClose={closeForm}
          footerSplit={!!editingGroup}
          footer={
            <>
              {editingGroup && (
                <div className="detail-footer-left">
                  {pendingDelete ? (
                    <>
                      <button className="btn btn-danger" onClick={() => void handleDelete()} disabled={busy}>Confirm Delete</button>
                      <button className="btn btn-ghost" onClick={() => setPendingDelete(false)} disabled={busy}>Cancel</button>
                    </>
                  ) : (
                    <button className="btn btn-danger" onClick={() => setPendingDelete(true)} disabled={busy}>Delete</button>
                  )}
                </div>
              )}
              <div className="detail-footer-right">
                <button className="btn btn-ghost" onClick={closeForm} disabled={busy}>Cancel</button>
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
          <div className="detail-section">
            <p className="detail-section-title">Name</p>
            <input
              className="group-name-input"
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Group name"
              autoFocus
            />
          </div>
          <div className="detail-section">
            <p className="detail-section-title">Topics ({form.topics.length} selected)</p>
            {availableTopics.length === 0 ? (
              <span style={{ fontSize: 13, color: 'var(--text)' }}>No topics available</span>
            ) : (
              <div className="group-topics-list">
                {availableTopics.map(topic => (
                  <label key={topic} className="group-topic-row">
                    <input
                      type="checkbox"
                      checked={form.topics.includes(topic)}
                      onChange={() => toggleTopic(topic)}
                    />
                    <span>{topic}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </section>
  );
};

export default TopicGroupsSection;