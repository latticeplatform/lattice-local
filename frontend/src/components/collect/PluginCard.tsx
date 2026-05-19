import type { FC } from "react";
import type { ConnectorPlugin } from '../../types/connect';

interface PluginCardProps extends ConnectorPlugin {
  onClick: () => void;
}

const PluginCard: FC<PluginCardProps> = ({ class: cls, type, version, onClick }) => {
  const shortName = cls.split('.').pop();

  return (
    <div className="card card--clickable" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="cardHeader">
        <span className="pluginClass" title={cls}>{shortName}</span>
        <span className="badge">{type}</span>
      </div>
      <span className="version">v{version}</span>
      <span className="pluginClassFull">{cls}</span>
    </div>
  );
};

export default PluginCard;