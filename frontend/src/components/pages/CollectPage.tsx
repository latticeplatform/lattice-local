import { type FC, useState } from 'react';
import type { ConnectorPlugin } from '../../types/connect';
import './CollectPage.css';
import ConnectorFormModal from '../ConnectorFormModal.tsx';
import { useConnect } from '../../context/ConnectContext.tsx';
import CardSection from "../CardSection.tsx";

const CollectPage:FC = () => {
  const { collectors, plugins, loading, refresh } = useConnect();
  const [selectedPlugin, setSelectedPlugin] = useState<ConnectorPlugin | null>(null);
  const validPlugins = plugins?.filter(p => p.type === 'source') ?? [];

  return (
    <div className="page">
      <CardSection title="Active Collectors" onRefresh={refresh} loading={loading} data={ collectors.map((entry) => ({ cardType: 'collector' as const, name: entry.info.name, entry }))}/>
      <CardSection title="Available Collector Plugins" data={validPlugins.map(plugin => ({ ...plugin, cardType: 'plugin' as const, onClick: () => setSelectedPlugin(plugin) }))}/>
      {selectedPlugin && <ConnectorFormModal plugin={selectedPlugin} onClose={() => setSelectedPlugin(null)} onCreated={refresh}/>}
    </div>
  );
}

export default CollectPage;