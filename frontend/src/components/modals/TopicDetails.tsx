import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConnectorEntry, TopicSchemaResult } from '../../types';
import { useConnect } from '../../context/ConnectContext.tsx';
import ModalShell from './ModalShell.tsx';
import SchemaDoc from '../schema/SchemaDoc.tsx';
import './ConnectorDetails.css';

interface TopicDetailsProps {
  name: string;
  sourceConnector: string;
  subscribingSinks: ConnectorEntry[];
  onClose: () => void;
}

const TopicDetails: FC<TopicDetailsProps> = ({ name, sourceConnector, subscribingSinks, onClose }) => {
  const navigate = useNavigate();
  const { dispatch } = useConnect();
  const [schema, setSchema] = useState<TopicSchemaResult | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    setSchemaLoading(true);
    setSchemaError(null);
    setSchema(null);
    dispatch({ type: 'TOPIC_FETCH_SCHEMA', topicName: name })
      .then(setSchema)
      .catch(err => setSchemaError(err instanceof Error ? err.message : 'Failed to load schema'))
      .finally(() => setSchemaLoading(false));
  }, [name]);

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

      <div className="detail-section">
        <p className="detail-section-title">Schema</p>
        {schemaLoading ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>Loading schema…</span>
        ) : schemaError ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>{schemaError}</span>
        ) : schema ? (
          <SchemaDoc result={schema} />
        ) : null}
      </div>

      <div className="detail-section">
        <p className="detail-section-title">Data Stream</p>
        {}
      </div>
    </ModalShell>
  );
};

export default TopicDetails;