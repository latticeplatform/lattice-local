import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConnectorEntry } from '../types/connect.ts';
import ModalShell from './ModalShell.tsx';
import './ConnectorDetails.css';

interface TopicDetailsProps {
  name: string;
  sourceConnector: string;
  subscribingSinks: ConnectorEntry[];
  onClose: () => void;
}

const TopicDetails: FC<TopicDetailsProps> = ({ name, sourceConnector, subscribingSinks, onClose }) => {
  const navigate = useNavigate();

  return (
    <ModalShell
      label={name}
      title={name}
      headerActions={<span className="badge">topic</span>}
      onClose={onClose}
    >
      <div className="detail-section">
        <p className="detail-section-title">Source Connector</p>
        <button
          className="detail-link"
          onClick={() => navigate(`/collect?details=${encodeURIComponent(sourceConnector)}`)}
        >
          {sourceConnector}
        </button>
      </div>
      <div className="detail-section">
        <p className="detail-section-title">Subscribers ({subscribingSinks.length})</p>
        {subscribingSinks.length === 0 ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>No sinks subscribed to this topic</span>
        ) : (
          subscribingSinks.map(sink => (
            <div key={sink.info.name} className="detail-task-row">
              <button
                className="detail-link"
                onClick={() => navigate(`/connect?details=${encodeURIComponent(sink.info.name)}`)}
              >
                {sink.info.name}
              </button>
              <span className="badge" style={{ marginLeft: 'auto' }}>{sink.status.connector.state}</span>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
};

export default TopicDetails;