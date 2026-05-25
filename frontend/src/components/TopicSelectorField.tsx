import { useState, useEffect, useRef, type FC } from 'react';
import type { ConfigDefinition, TopicGroup } from '../types';
import { useConnect } from '../context/ConnectContext.tsx';

interface TopicSelectorFieldProps {
  def: ConfigDefinition;
  isRequired: boolean;
  value: string;
  errors: string[];
  onChange: (v: string) => void;
}

interface IndeterminateCheckboxProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}

const IndeterminateCheckbox: FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate,
  onChange,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input type="checkbox" ref={ref} checked={checked} onChange={onChange} />;
};

const TopicSelectorField: FC<TopicSelectorFieldProps> = ({
  def,
  isRequired,
  value,
  errors,
  onChange,
}) => {
  const { topics: topicsResponse, dispatch } = useConnect();
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [search, setSearch] = useState('');

  const allTopics = Object.values(topicsResponse)
    .flatMap((c) => c.topics)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .sort();

  const selectedTopics = new Set(
    value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );

  useEffect(() => {
    void dispatch({ type: 'TOPIC_FETCH_GROUPS' })
      .then(setGroups)
      .catch(() => {});
  }, [dispatch]);

  const toggle = (topic: string) => {
    const next = new Set(selectedTopics);
    if (next.has(topic)) {
      next.delete(topic);
    } else {
      next.add(topic);
    }
    onChange([...next].join(','));
  };

  const toggleGroup = (group: TopicGroup) => {
    const allSelected = group.topics.every((t) => selectedTopics.has(t));
    const next = new Set(selectedTopics);
    if (allSelected) {
      group.topics.forEach((t) => next.delete(t));
    } else {
      group.topics.forEach((t) => next.add(t));
    }
    onChange([...next].join(','));
  };

  const filteredTopics = search
    ? allTopics.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : allTopics;

  const hasError = errors.length > 0;

  return (
    <div className="form-field">
      <label>
        {def.display_name}
        {isRequired && <span className="required-mark">*</span>}
      </label>
      {def.documentation && <p className="field-doc">{def.documentation}</p>}
      <div className={`topic-selector${hasError ? ' topic-selector--error' : ''}`}>
        {groups.length > 0 && (
          <div className="topic-selector-section">
            <p className="topic-selector-label">Groups</p>
            <div className="group-topics-list">
              {groups.map((group) => {
                const numSelected = group.topics.filter((t) => selectedTopics.has(t)).length;
                const checked = group.topics.length > 0 && numSelected === group.topics.length;
                const indeterminate = numSelected > 0 && !checked;
                return (
                  <label key={group.name} className="group-topic-row">
                    <IndeterminateCheckbox
                      checked={checked}
                      indeterminate={indeterminate}
                      onChange={() => {
                        toggleGroup(group);
                      }}
                    />
                    <span>{group.name}</span>
                    <span className="group-count">({group.topics.length})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        <div className="topic-selector-section">
          <p className="topic-selector-label">
            Topics{selectedTopics.size > 0 && ` — ${String(selectedTopics.size)} selected`}
          </p>
          {allTopics.length > 6 && (
            <input
              type="text"
              className="topic-selector-search"
              placeholder="Search topics…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          )}
          {allTopics.length === 0 ? (
            <span className="topic-selector-empty">No topics available</span>
          ) : (
            <div className="group-topics-list">
              {filteredTopics.map((topic) => (
                <label key={topic} className="group-topic-row">
                  <input
                    type="checkbox"
                    checked={selectedTopics.has(topic)}
                    onChange={() => {
                      toggle(topic);
                    }}
                  />
                  <span>{topic}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {errors.map((err, i) => (
        <span key={i} className="field-error">
          {err}
        </span>
      ))}
    </div>
  );
};

export default TopicSelectorField;
