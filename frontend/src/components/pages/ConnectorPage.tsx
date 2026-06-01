import { useEffect, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Page.css';
import useModal from '../../hooks/useModal.ts';
import useConnect from '../../hooks/useConnect.ts';
import CardSection from '../CardSection.tsx';
import type { CardsData } from '../../types';
import { capitalize } from '../../utils';

interface ConnectorPageProps {
  type: 'sink' | 'source';
}

const ConnectorPage: FC<ConnectorPageProps> = ({ type }) => {
  const { collectors, sinks, plugins, loading, refresh } = useConnect();
  const { open } = useModal();
  const [searchParams, setSearchParams] = useSearchParams();

  const entries = type === 'source' ? collectors : sinks;
  const validPlugins = plugins?.filter((p) => p.type === type) ?? [];

  const validConnectors: CardsData = entries.map((entry) => ({
    cardType: type,
    entry,
    onClick: () => {
      open({ kind: 'connector-details', name: entry.info.name });
    },
  }));

  const detailsName = searchParams.get('details');
  useEffect(() => {
    if (detailsName) {
      open({ kind: 'connector-details', name: detailsName });
      setSearchParams(
        (prev) => {
          prev.delete('details');
          return prev;
        },
        { replace: true }
      );
    }
  }, [detailsName, open, setSearchParams]);

  return (
    <div className="page">
      <CardSection
        title={`Active ${capitalize(type)}s`}
        onRefresh={refresh}
        loading={loading}
        data={validConnectors}
      />
      <CardSection
        title={`Available ${capitalize(type)} Plugins`}
        data={validPlugins.map((plugin) => ({
          ...plugin,
          cardType: 'plugin' as const,
          onClick: () => {
            open({ kind: 'connector-form', pluginClass: plugin.class });
          },
        }))}
      />
    </div>
  );
};

export default ConnectorPage;
