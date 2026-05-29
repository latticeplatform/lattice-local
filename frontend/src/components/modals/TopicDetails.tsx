import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConnectorEntry, TopicSchemaResult } from '../../types';
import useConnect from '../../hooks/useConnect.ts';
import ModalShell from './ModalShell.tsx';
import SchemaDoc from '../schema/SchemaDoc.tsx';
import './ConnectorDetails.css';
import DetailSection from '../DetailSection.tsx';

interface TopicDetailsProps {
  name: string;
  sourceConnector: string;
  subscribingSinks: ConnectorEntry[];
  onClose: () => void;
}

const TopicDetails: FC<TopicDetailsProps> = ({
  name,
  sourceConnector,
  subscribingSinks,
  onClose,
}) => {
  const navigate = useNavigate();
  const { dispatch } = useConnect();
  const [schema, setSchema] = useState<TopicSchemaResult | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch({ type: 'TOPIC_FETCH_SCHEMA', topicName: name })
      .then((result) => {
        setSchema(result);
        setSchemaError(null);
        setSchemaLoading(false);
      })
      .catch((err: unknown) => {
        setSchema(null);
        setSchemaError(err instanceof Error ? err.message : 'Failed to load schema');
        setSchemaLoading(false);
      });
  }, [name, dispatch]);

  return (
    <ModalShell
      label={name}
      title={name}
      headerActions={<span className="badge">topic</span>}
      onClose={onClose}
    >

      <DetailSection title={'Source Connector'}>
        <button
          className="detail-link"
          onClick={() => void navigate(`/collect?details=${encodeURIComponent(sourceConnector)}`)}
        >
          {sourceConnector}
        </button>
      </DetailSection>

      <DetailSection title={`Subscribers (${String(subscribingSinks.length)})`}>
        {subscribingSinks.length === 0 ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>
            No sinks subscribed to this topic
          </span>
        ) : (
          subscribingSinks.map((sink) => (
            <div key={sink.info.name} className="detail-task-row">
              <button
                className="detail-link"
                onClick={() =>
                  void navigate(`/connect?details=${encodeURIComponent(sink.info.name)}`)
                }
              >
                {sink.info.name}
              </button>
              <span className="badge" style={{ marginLeft: 'auto' }}>
                {sink.status.connector.state}
              </span>
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title={'Schema'}>
        {schemaLoading ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>
            Loading schema…
          </span>
        ) : schemaError ? (
          <span className="detail-state" style={{ color: 'var(--text)' }}>
            {schemaError}
          </span>
        ) : schema ? (
          <SchemaDoc result={schema} />
        ) : null}
      </DetailSection>

    </ModalShell>
  );
};

export default TopicDetails;
