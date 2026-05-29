import type { FC } from 'react';
import { SENSITIVE_KEYS } from '../constants.ts';
import { FaEdit } from 'react-icons/fa';
import { FaXmark} from 'react-icons/fa6';

interface ConfigDetailRowProps {
  name: string;
  value: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (value: string) => void;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}

const maskIfSensitive = (key: string, value: string): string => {
  return SENSITIVE_KEYS.test(key) ? '••••••' : value;
};

const ConfigDetailRow: FC<ConfigDetailRowProps> = ({
  name,
  value,
  editable,
  editing,
  onChange,
  onEditStart,
  onEditCancel,
}) => {
  const rowClass = [
    'detail-config-row',
    editable && 'detail-config-row--editable',
    editing && 'detail-config-row--editing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass}>
      <span className="detail-config-key">{name}</span>
      {editing ? (
        <input
          className="detail-config-input"
          type={SENSITIVE_KEYS.test(name) ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <span className="detail-config-value">{maskIfSensitive(name, value)}</span>
      )}
      {editable && (
        <button
          className="detail-config-edit-btn"
          onClick={editing ? onEditCancel : onEditStart}
          aria-label={editing ? 'Cancel edit' : 'Edit'}
        >
          {editing ? <FaXmark /> : <FaEdit />}
        </button>
      )}
    </div>
  );
};

export default ConfigDetailRow;