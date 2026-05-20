import { useEffect, useState, useCallback, type FC } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import type {
  ConnectorPlugin,
  ConfigDefinition,
  ValidationResult,
  ValidationFieldResultValue
} from '../types/connect';
import { useToast } from '../context/ToastContext.tsx';
import { fetchPluginConfig, validateConnectorConfig, createConnector } from '../api/connectApi.ts';
import './ConnectorFormModal.css';
import FormField from "./FormField.tsx";
import { groupByKey } from "../utils.ts";
import GearPanel from "./GearPanel.tsx";

interface ConnectorFormModalProps {
  plugin: ConnectorPlugin;
  onClose: () => void;
  onCreated: () => void;
}

const getNonNullValuesFromValidation = (
  results:ValidationResult
): ValidationFieldResultValue[] => {
   return results.configs.map((result) => result.value).filter(value => value !== null)
}

const ConnectorFormModal: FC<ConnectorFormModalProps> = ({ plugin, onClose, onCreated }) => {
  const [definitions, setDefinitions] = useState<ConfigDefinition[]>([]);
  const [derivedRequired, setDerivedRequired] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showGearPanel, setShowGearPanel] = useState(false);
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());

  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [defs, emptyValidation] = await Promise.all([
          fetchPluginConfig(plugin.class),
          validateConnectorConfig(plugin.class, { 'connector.class': plugin.class }),
        ]);
        const values = getNonNullValuesFromValidation(emptyValidation)
        setDefinitions(defs);
        setDerivedRequired(new Set(
          values
            .filter(( value ) =>value.errors.length > 0 )
            .map(( value ) => value.name)
        ));
        const initial: Record<string, string> = { 'connector.class': plugin.class };
        for (const def of defs) {
          if (def.name !== 'connector.class' && def.default_value) {
            initial[def.name] = def.default_value;
          }
        }
        setValues(initial);
      } catch (e) {
        console.log(e)
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


  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const config = { ...values, 'connector.class': plugin.class };

      const validationResult = getNonNullValuesFromValidation(await validateConnectorConfig(plugin.class, config));

      const newErrors: Record<string, string[]> = {};
      for (const value of validationResult) {
        if (value.errors.length > 0) newErrors[value.name] = value.errors;
      }

      if (Object.keys(newErrors).length > 0) {
        const hiddenOptionals = Object.keys(newErrors).filter(
          name => !derivedRequired.has(name) && !enabledOptional.has(name)
        );
        if (hiddenOptionals.length > 0) {
          setEnabledOptional(prev => {
            const next = new Set(prev);
            for (const name of hiddenOptionals) next.add(name);
            return next;
          });
          setValues(prev => {
            const next = { ...prev };
            for (const name of hiddenOptionals) {
              if (!next[name]) {
                const def = definitions.find(d => d.name === name);
                if (def?.default_value) next[name] = def.default_value;
              }
            }
            return next;
          });
        }
        setErrors(newErrors);
        toast.push(`${Object.keys(newErrors).length} errors found in configuration`);
        return;
      }

      await createConnector(values['name'] ?? '', config);

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

  const requiredDefs = baseDefs.filter(d => derivedRequired.has(d.name));
  const optionalDefs = baseDefs.filter(d => !derivedRequired.has(d.name));

  const activeDefs = [
    ...requiredDefs,
    ...optionalDefs.filter(d => enabledOptional.has(d.name)),
  ];

  const grouped = groupByKey(activeDefs, d => d.group ?? 'General');





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

      {showGearPanel &&
        <GearPanel
          optionalDefs={optionalDefs}
          setEnabledOptional={setEnabledOptional}
          enabledOptional={enabledOptional}
          setValues={setValues}
        />
      }

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
                    isRequired={derivedRequired.has(def.name)}
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

export default ConnectorFormModal;