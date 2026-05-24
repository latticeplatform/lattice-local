import { type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from '../CardSection.tsx';
import type { TopicCardProps } from '../../types/cardTypes.ts';
import type { ConnectorEntry } from '../../types/connect.ts';
import TopicDetails from '../modals/TopicDetails.tsx';
import TopicGroupsSection from '../TopicGroupsSection.tsx';
import './Page.css';

const ComposePage: FC = () => {
  const { topics, sinks, loading, refresh } = useConnect();
  const [searchParams, setSearchParams] = useSearchParams();

  const topicIndex = Object.entries(topics).flatMap(([connector, { topics: names }]) =>
    names.map(name => ({ name, sourceConnector: connector }))
  );

  const topicCards: TopicCardProps[] = topicIndex.map(({ name, sourceConnector }) => ({
    cardType: 'topic' as const,
    name,
    sourceConnector,
    onClick: () => setSearchParams(prev => { prev.set('details', name); return prev; }),
  }));

  const detailsName = searchParams.get('details');
  const selectedTopic = detailsName ? (topicIndex.find(t => t.name === detailsName) ?? null) : null;

  const closeDetails = () => setSearchParams(prev => { prev.delete('details'); return prev; });

  const getSubscribingSinks = (topicName: string): ConnectorEntry[] =>
    sinks.filter(sink => {
      const topicsRegex = sink.info.config['topics.regex'];
      if (topicsRegex) {
        try { return new RegExp(topicsRegex).test(topicName); } catch { return false; }
      }
      return (sink.info.config['topics'] ?? '').split(',').map(t => t.trim()).includes(topicName);
    });

  return (
    <div className="page">
      <CardSection title="Topics" onRefresh={refresh} loading={loading} data={topicCards} />
      <TopicGroupsSection availableTopics={topicIndex.map(t => t.name)} />
      {selectedTopic && (
        <TopicDetails
          name={selectedTopic.name}
          sourceConnector={selectedTopic.sourceConnector}
          subscribingSinks={getSubscribingSinks(selectedTopic.name)}
          onClose={closeDetails}
        />
      )}
    </div>
  );
};

export default ComposePage;