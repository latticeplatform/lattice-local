import { useState, useCallback, type FC, useEffect } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import type {
  ConfigDefinition,
  ValidationResult,
  ValidationFieldResultValue,
} from '../../types';
import useToast from '../../hooks/useToast.ts';
import useConnect from '../../hooks/useConnect.ts';
import ModalShell from './ModalShell.tsx';
import './ConnectorForm.css';
import FormField from '../FormField.tsx';
import TopicSelectorField from '../TopicSelectorField.tsx';
import { groupByKey } from '../../utils';
import GearPanel from '../GearPanel.tsx';

interface ConnectorFormProps {
  pluginClass: string;
  onClose: () => void;
}

const getNonNullValuesFromValidation = (
  results: ValidationResult
): ValidationFieldResultValue[] => {
  return results.configs.map((result) => result.value).filter((value) => value !== null);
};

const ConnectorForm: FC<ConnectorFormProps> = ({ pluginClass, onClose }) => {
  const [definitions, setDefinitions] = useState<ConfigDefinition[]>([]);
  const [derivedRequired, setDerivedRequired] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showGearPanel, setShowGearPanel] = useState(false);
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());

  const toast = useToast();
  const { dispatch, refresh } = useConnect();

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: [] }));
  }, []);

  useEffect(() => {
    void dispatch({ type: 'PLUGIN_FETCH_CONFIG', pluginClass })
      .then((defs) => {
        setDefinitions(defs);
        setDerivedRequired(new Set(defs.filter((d) => d.required).map((d) => d.name)));
      })
      .catch((e: unknown) => {
        toast.push(e instanceof Error ? e.message : 'Failed to load plugin config');
        onClose();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pluginClass, toast, onClose, dispatch]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const config = { ...values, 'connector.class': pluginClass };

      const validationResult = getNonNullValuesFromValidation(
        await dispatch({ type: 'PLUGIN_VALIDATE_CONFIG', pluginClass, config })
      );

      const newErrors: Record<string, string[]> = {};
      for (const value of validationResult) {
        if (value.errors.length > 0) newErrors[value.name] = value.errors;
      }

      if (Object.keys(newErrors).length > 0) {
        const hiddenOptionals = Object.keys(newErrors).filter(
          (name) => !derivedRequired.has(name) && !enabledOptional.has(name)
        );
        if (hiddenOptionals.length > 0) {
          setEnabledOptional((prev) => {
            const next = new Set(prev);
            for (const name of hiddenOptionals) next.add(name);
            return next;
          });
          setValues((prev) => {
            const next = { ...prev };
            for (const name of hiddenOptionals) {
              if (!next[name]) {
                const def = definitions.find((d) => d.name === name);
                if (def?.default_value) next[name] = def.default_value;
              }
            }
            return next;
          });
        }
        setErrors(newErrors);
        toast.push(`${String(Object.keys(newErrors).length)} errors found in configuration`);
        return;
      }

      await dispatch({ type: 'CONNECTOR_CREATE', name: values['name'] ?? '', config });

      toast.push('Connector created successfully', 'success');
      refresh();
      onClose();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const baseDefs = definitions.filter((d) => d.name !== 'connector.class');
  const requiredDefs = baseDefs.filter((d) => derivedRequired.has(d.name));
  const optionalDefs = baseDefs.filter((d) => !derivedRequired.has(d.name));
  const activeDefs = [...requiredDefs, ...optionalDefs.filter((d) => enabledOptional.has(d.name))];
  const grouped = groupByKey(activeDefs, (d) => d.group ?? 'General');
  const shortName = pluginClass.split('.').pop();

  return (
    <ModalShell
      title={`New ${shortName ?? pluginClass}`}
      onClose={onClose}
      headerActions={
        <>
          <button
            type="button"
            className={`modal-gear${showGearPanel ? ' modal-gear--active' : ''}`}
            onClick={() => {
              setShowGearPanel((p) => !p);
            }}
            aria-label="Optional fields"
            title={`${String(optionalDefs.length)} optional fields`}
          >
            <IoSettingsOutline />
            {enabledOptional.size > 0 && <span className="gear-badge">{enabledOptional.size}</span>}
          </button>
        </>
      }
      panel={
        showGearPanel && (
          <GearPanel
            optionalDefs={optionalDefs}
            setEnabledOptional={setEnabledOptional}
            enabledOptional={enabledOptional}
            setValues={setValues}
          />
        )
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={loading || submitting}
          >
            {submitting ? 'Creating…' : 'Create Connector'}
          </button>
        </>
      }
    >
      {loading ? (
        <span>Loading config…</span>
      ) : (
        Object.entries(grouped).map(([group, defs]) => (
          <div key={group}>
            <p className="field-group-title">{group}</p>
            <div className="field-group">
              {defs.map((def) =>
                def.name === 'topics' ? (
                  <TopicSelectorField
                    key={def.name}
                    def={def}
                    isRequired={derivedRequired.has(def.name)}
                    value={values[def.name] ?? ''}
                    errors={errors[def.name] ?? []}
                    onChange={(v) => {
                      setValue(def.name, v);
                    }}
                  />
                ) : (
                  <FormField
                    key={def.name}
                    def={def}
                    isRequired={derivedRequired.has(def.name)}
                    value={values[def.name] ?? ''}
                    errors={errors[def.name] ?? []}
                    onChange={(v) => {
                      setValue(def.name, v);
                    }}
                  />
                )
              )}
            </div>
          </div>
        ))
      )}
    </ModalShell>
  );
};

export default ConnectorForm;
