import { useState, useCallback, useEffect, type FC } from 'react';
import type { TopicGroup } from '../types';
import { useToast } from '../context/ToastContext.tsx';
import { useConnect } from '../context/ConnectContext.tsx';
import TopicGroupForm from './modals/TopicGroupForm.tsx';

interface TopicGroupsSectionProps {
  availableTopics: string[];
}

const TopicGroupsSection: FC<TopicGroupsSectionProps> = ({ availableTopics }) => {
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<TopicGroup | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const toast = useToast();
  const { dispatch } = useConnect();

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await dispatch({ type: 'TOPIC_FETCH_GROUPS' }));
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to load topic groups');
    }
  }, [toast, dispatch]);

  useEffect(() => {
    void dispatch({ type: 'TOPIC_FETCH_GROUPS' })
      .then(setGroups)
      .catch((e: unknown) => {
        toast.push(e instanceof Error ? e.message : 'Failed to load topic groups');
      });
  }, [dispatch, toast]);

  const openCreate = () => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const openEdit = (group: TopicGroup) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Topic Groups</h2>
        <button type="button" className="refreshButton" onClick={openCreate}>
          New Group
        </button>
      </div>
      {groups.length === 0 ? (
        <div className="empty">No topic groups</div>
      ) : (
        <div className="group-list">
          {groups.map((group) => (
            <div key={group.name} className="group-row">
              <span className="group-name">{group.name}</span>
              <span className="group-count">
                {group.topics.length} topic{group.topics.length !== 1 ? 's' : ''}
              </span>
              <button
                className="detail-task-restart"
                onClick={() => {
                  openEdit(group);
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
      {formOpen && (
        <TopicGroupForm
          editingGroup={editingGroup}
          availableTopics={availableTopics}
          onClose={() => {
            setFormOpen(false);
          }}
          onSaved={() => void loadGroups()}
        />
      )}
    </section>
  );
};

export default TopicGroupsSection;
