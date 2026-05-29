import { useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Page.css';
import ConnectorForm from '../modals/ConnectorForm.tsx';
import ConnectorDetails from '../modals/ConnectorDetails.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from '../CardSection.tsx';
import type { CardsData } from '../../types';
import { capitalize } from '../../utils';

interface ConnectorPageProps {
  type: 'sink' | 'source';
}

const ConnectorPage: FC<ConnectorPageProps> = ({ type }) => {
  const { collectors, sinks, plugins, loading, refresh } = useConnect();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);

  const entries = type === 'source' ? collectors : sinks;
  const validPlugins = plugins?.filter((p) => p.type === type) ?? [];

  const validConnectors: CardsData = entries.map((entry) => ({
    cardType: type,
    entry,
    onClick: () => {
      setSearchParams((prev) => {
        prev.set('details', entry.info.name);
        return prev;
      });
    },
  }));

  const detailsName = searchParams.get('details');

  const closeDetails = () => {
    setSearchParams((prev) => {
      prev.delete('details');
      return prev;
    });
  };

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
            setSelectedPlugin(plugin.class);
          },
        }))}
      />
      {detailsName && <ConnectorDetails name={detailsName} onClose={closeDetails} />}
      {selectedPlugin && (
        <ConnectorForm
          pluginClass={selectedPlugin}
          onClose={() => {
            setSelectedPlugin(null);
          }}
          onCreated={refresh}
        />
      )}
    </div>
  );
};

export default ConnectorPage;
