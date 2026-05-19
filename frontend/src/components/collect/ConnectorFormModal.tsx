import { useEffect, useState, useCallback, type FC } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import type { ConnectorPlugin, ConfigDefinition, ValidationResult } from '../../types/connect';
import { useToast } from '../../context/ToastContext.tsx';
import './ConnectorFormModal.css';
import FormField from "./FormField.tsx";

interface ConnectorFormModalProps {
  plugin: ConnectorPlugin;
  onClose: () => void;
  onCreated: () => void;
}

const ConnectorFormModal: FC<ConnectorFormModalProps> = ({ plugin, onClose, onCreated }) => {
  const [definitions, setDefinitions] = useState<ConfigDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showGearPanel, setShowGearPanel] = useState(false);
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());
  const [optionalSearch, setOptionalSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/connector-plugins/${encodeURIComponent(plugin.class)}/config`);
        if (!res.ok) { toast.push('Failed to load plugin config'); onClose(); return; }
        const defs = await res.json() as ConfigDefinition[];
        setDefinitions(defs);
        const initial: Record<string, string> = { 'connector.class': plugin.class };
        for (const def of defs) {
          if (def.name !== 'connector.class' && def.default_value) {
            initial[def.name] = def.default_value;
          }
        }
        setValues(initial);
      } catch (e) {
        toast.push(e instanceof Error ? e.message : 'Failed to load plugin config');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    void fetchConfig();
  }, [plugin.class, toast, onClose]);

  const setValue = useCallback((name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: [] }));
  }, []);

  const toggleOptional = useCallback((def: ConfigDefinition) => {
    setEnabledOptional(prev => {
      const next = new Set(prev);
      if (next.has(def.name)) {
        next.delete(def.name);
        setValues(v => { const c = { ...v }; delete c[def.name]; return c; });
      } else {
        next.add(def.name);
        if (def.default_value) {
          setValues(v => ({ ...v, [def.name]: def.default_value! }));
        }
      }
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const config = { ...values, 'connector.class': plugin.class };

      const validateRes = await fetch(
        `/api/connector-plugins/${encodeURIComponent(plugin.class)}/config/validate`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }
      );
      const validation = await validateRes.json() as ValidationResult;

      const newErrors: Record<string, string[]> = {};
      for (const { value } of validation.configs) {
        if (value.errors.length > 0) newErrors[value.name] = value.errors;
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.push(`${Object.keys(newErrors).length} errors found in configuration`)
        return;
      }

      const createRes = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values['name'] ?? '', config }),
      });

      if (!createRes.ok) { toast.push('Failed to create connector'); return; }

      toast.push('Connector created successfully', 'success');
      onCreated();
      onClose();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const baseDefs   = definitions.filter(d => d.name !== 'connector.class');
  const requiredDefs = baseDefs.filter(d => d.required);
  const optionalDefs = baseDefs.filter(d => !d.required);

  const activeDefs = [
    ...requiredDefs,
    ...optionalDefs.filter(d => enabledOptional.has(d.name)),
  ];
  const grouped = groupByKey(activeDefs, d => d.group ?? 'General');

  const filteredOptional = optionalDefs.filter(d =>
    optionalSearch === '' ||
    d.display_name.toLowerCase().includes(optionalSearch.toLowerCase()) ||
    d.name.toLowerCase().includes(optionalSearch.toLowerCase())
  );
  const optionalGrouped = groupByKey(filteredOptional, d => d.group ?? 'General');

  const shortName = plugin.class.split('.').pop();

  return (
    <>
    <div className="modal-backdrop" onClick={onClose} />
    <div className="connector-modal" role="dialog" aria-modal="true" aria-label={`New ${shortName}`}>
      <div className="modal-header">
        <h2>New {shortName}</h2>
        <div className="modal-header-actions">
          {!loading && (
            <button
              type="button"
              className={`modal-gear${showGearPanel ? ' modal-gear--active' : ''}`}
              onClick={() => setShowGearPanel(p => !p)}
              aria-label="Optional fields"
              title={`${optionalDefs.length} optional fields`}
            >
              <IoSettingsOutline />
              {enabledOptional.size > 0 && (
                <span className="gear-badge">{enabledOptional.size}</span>
              )}
            </button>
          )}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      {showGearPanel && (
        <div className="gear-panel">
          <input
            className="gear-search"
            placeholder="Search optional fields…"
            value={optionalSearch}
            onChange={e => setOptionalSearch(e.target.value)}
            autoFocus
          />
          <div className="gear-list">
            {Object.entries(optionalGrouped).map(([group, defs]) => (
              <div key={group} className="gear-group">
                <p className="gear-group-title">{group}</p>
                {defs.map(def => (
                  <label key={def.name} className="gear-item">
                    <input
                      type="checkbox"
                      checked={enabledOptional.has(def.name)}
                      onChange={() => toggleOptional(def)}
                    />
                    <span title={def.documentation} >{def.display_name}</span>
                  </label>
                ))}
              </div>
            ))}
            {filteredOptional.length === 0 && (
              <span className="gear-empty">No matching fields.</span>
            )}
          </div>
        </div>
      )}

      <div className="modal-body">
        {loading ? (
          <span>Loading config…</span>
        ) : (
          Object.entries(grouped).map(([group, defs]) => (
            <div key={group}>
              <p className="field-group-title">{group}</p>
              <div className="field-group">
                {defs.map(def => (
                  <FormField
                    key={def.name}
                    def={def}
                    value={values[def.name] ?? ''}
                    errors={errors[def.name] ?? []}
                    onChange={v => setValue(def.name, v)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSubmit()}
          disabled={loading || submitting}
        >
          {submitting ? 'Creating…' : 'Create Connector'}
        </button>
      </div>
    </div>
    </>
  );
}

function groupByKey<T>(items: T[], key: (item: T) => string): Record<string, T[]> {

  return items
    .slice()
    .sort((a, b) => {
      const ka = key(a), kb = key(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .reduce<Record<string, T[]>>((acc, item) => {
      const k = key(item);
      (acc[k] ??= []).push(item);
      return acc;
    }, {});
};

export default ConnectorFormModal;