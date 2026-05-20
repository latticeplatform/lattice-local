import { type FC, useState } from 'react';
import type { ConnectorPlugin } from '../../types/connect';
import './CollectPage.css';
import ConnectorFormModal from '../ConnectorFormModal.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from "../CardSection.tsx";

const SinkPage:FC = () => {
  const { sinks, plugins, loading, refresh } = useConnect();
  const [selectedPlugin, setSelectedPlugin] = useState<ConnectorPlugin | null>(null);
  const validPlugins = plugins?.filter(p => p.type === 'sink') ?? [];
  return (
    <div className="page">
      <CardSection title="Active Sinks" onRefresh={refresh} loading={loading} data={ sinks.map((entry) => ({ cardType: 'collector' as const, name: entry.info.name, entry }))}/>
      <CardSection title="Available Sink Plugins" data={validPlugins.map(plugin => ({ ...plugin, cardType: 'plugin' as const, onClick: () => setSelectedPlugin(plugin) }))}/>
      {selectedPlugin && <ConnectorFormModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} onCreated={refresh}/>}
    </div>
  );
}

export default SinkPage;