import { useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ConnectorPlugin } from '../../types';
import './Page.css';
import ConnectorForm from '../modals/ConnectorForm.tsx';
import ConnectorDetails from '../modals/ConnectorDetails.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from "../CardSection.tsx";
import type { CardsData, ConnectorCardProps } from "../../types";
import { capitalize } from "../../utils";

interface ConnectorPageProps {
  type: 'sink' | 'source';
}

const ConnectorPage: FC<ConnectorPageProps> = ({ type }) => {
  const { collectors, sinks, plugins, loading, refresh } = useConnect();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlugin, setSelectedPlugin] = useState<ConnectorPlugin | null>(null);

  const entries = type === 'source' ? collectors : sinks;
  const validPlugins = plugins?.filter(p => p.type === type) ?? [];

  const validConnectors: CardsData = entries.map(entry => ({
    cardType: type,
    entry,
    onClick: () => setSearchParams(prev => { prev.set('details', entry.info.name); return prev; }),
  })) as CollectorCardProps[] | SinkCardProps[];

  const detailsName = searchParams.get('details');
  const selectedEntry = detailsName ? (entries.find(e => e.info.name === detailsName) ?? null) : null;

  const closeDetails = () => setSearchParams(prev => { prev.delete('details'); return prev; });

  return (
    <div className="page">
      <CardSection title={`Active ${capitalize(type)}s`} onRefresh={refresh} loading={loading} data={validConnectors} />
      <CardSection title={`Available ${capitalize(type)} Plugins`} data={validPlugins.map(plugin => ({ ...plugin, cardType: 'plugin' as const, onClick: () => setSelectedPlugin(plugin) }))} />
      {selectedEntry && <ConnectorDetails entry={selectedEntry} onClose={closeDetails} onAction={refresh} />}
      {selectedPlugin && <ConnectorForm plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} onCreated={refresh} />}
    </div>
  );
}

export default ConnectorPage;