import type { FC } from 'react';
import { SENSITIVE_KEYS } from '../constants.ts';

interface ConfigDetailRowProps {
  name: string;
  value: string;
}

const maskIfSensitive = (key: string, value: string): string => {
  return SENSITIVE_KEYS.test(key) ? '••••••' : value;
};

const ConfigDetailRow: FC<ConfigDetailRowProps> = ({name, value}) => {

  return (
    <div className="detail-config-row">
      <span className="detail-config-key">{name}</span>
      <span className="detail-config-value">{maskIfSensitive(name, value)}</span>
    </div>
  );
};

export default ConfigDetailRow;