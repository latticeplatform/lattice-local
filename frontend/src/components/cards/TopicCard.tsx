import type { FC } from 'react';
import type { TopicCardProps } from '../../types/cardTypes.ts';

const TopicCard: FC<TopicCardProps> = ({ name, sourceConnector, onClick }) => (
  <div
    className="card card--clickable"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={e => e.key === 'Enter' && onClick()}
  >
    <div className="cardHeader">
      <span className="cardName">{name}</span>
      <span className="badge">topic</span>
    </div>
    <span className="pluginClassFull">{sourceConnector}</span>
  </div>
);

export default TopicCard;