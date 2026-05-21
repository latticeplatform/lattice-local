import { type FC, useState } from 'react';
import type { ConnectorEntry, ConnectorPlugin } from '../../types/connect';
import './CollectPage.css';
import ConnectorForm from '../ConnectorForm.tsx';
import ConnectorDetails from '../ConnectorDetails.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from "../CardSection.tsx";

const SinkPage:FC = () => {
  const { sinks, plugins, loading, refresh } = useConnect();
  const [selectedPlugin, setSelectedPlugin] = useState<ConnectorPlugin | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ConnectorEntry | null>(null);
  const validPlugins = plugins?.filter(p => p.type === 'sink') ?? [];
  return (
    <div className="page">
      <CardSection title="Active Sinks" onRefresh={refresh} loading={loading} data={sinks.map((entry) => ({ cardType: 'sink' as const, entry, onClick: () => setSelectedEntry(entry) }))}/>
      <CardSection title="Available Sink Plugins" data={validPlugins.map(plugin => ({ ...plugin, cardType: 'plugin' as const, onClick: () => setSelectedPlugin(plugin) }))}/>
      {selectedEntry && <ConnectorDetails entry={selectedEntry} onClose={() => setSelectedEntry(null)} onAction={refresh} />}
      {selectedPlugin && <ConnectorForm plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} onCreated={refresh}/>}
    </div>
  );
}

export default SinkPage;