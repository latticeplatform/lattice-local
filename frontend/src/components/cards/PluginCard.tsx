import type { FC } from 'react';
import type { PluginCardProps } from '../../types';

const PluginCard: FC<PluginCardProps> = ({ class: cls, type, version, onClick }) => {
  const shortName = cls.split('.').pop();

  return (
    <div
      className="card card--clickable"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <div className="cardHeader">
        <span className="pluginClass" title={cls}>
          {shortName}
        </span>
        <span className="badge">{type}</span>
      </div>
      <span className="version">v{version}</span>
      <span className="pluginClassFull">{cls}</span>
    </div>
  );
};

export default PluginCard;
