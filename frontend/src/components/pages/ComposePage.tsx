import { useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import useConnect from '../../hooks/useConnect.ts';
import useModal from '../../hooks/useModal.ts';
import CardSection from '../CardSection.tsx';
import type { TopicCardProps } from '../../types';
// import TopicGroupsSection from '../TopicGroupsSection.tsx';
import './Page.css';

const ComposePage: FC = () => {
  const { topics, loading, refresh } = useConnect();
  const { open } = useModal();
  const [searchParams, setSearchParams] = useSearchParams();

  const topicIndex = Object.entries(topics).flatMap(([connector, { topics: names }]) =>
    names.map((name) => ({ name, sourceConnector: connector }))
  );

  const topicCards: TopicCardProps[] = topicIndex.map(({ name, sourceConnector }) => ({
    cardType: 'topic' as const,
    name,
    sourceConnector,
    onClick: () => {
      open({ kind: 'topic-details', name, sourceConnector });
    },
  }));
  const detailsName = searchParams.get('details');
  useEffect(() => {
    if (detailsName) {
      const topic = topicIndex.find((t) => t.name === detailsName);
      if (topic) {
        open({ kind: 'topic-details', name: topic.name, sourceConnector: topic.sourceConnector });
        setSearchParams(
          (prev) => {
            prev.delete('details');
            return prev;
          },
          { replace: true }
        );
      }
    }
  }, [detailsName, open, setSearchParams]);

  return (
    <div className="page">
      <CardSection title="Topics" onRefresh={refresh} loading={loading} data={topicCards} />
    </div>
  );
};

export default ComposePage;
