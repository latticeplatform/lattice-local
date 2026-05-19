import { useEffect, useState, useCallback } from 'react';
import type { ConnectorsResponse, ConnectorPlugin } from '../../types/connect';
import './CollectPage.css';
import { useToast } from '../../context/ToastContext.tsx';
import ConnectorCard from './ConnectorCard.tsx';
import PluginCard from './PluginCard.tsx';
import ConnectorFormModal from './ConnectorFormModal.tsx';

export default function CollectPage() {
  const [connectors, setConnectors] = useState<ConnectorsResponse | null>(null);
  const [plugins, setPlugins] = useState<ConnectorPlugin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<ConnectorPlugin | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectorsRes, pluginsRes] = await Promise.all([
        fetch('/api/connectors'),
        fetch('/api/connector-plugins'),
      ]);

      if (!connectorsRes.ok || !pluginsRes.ok) {
        toast.push('Failed to fetch from Kafka Connect');
        return;
      }

      const [connectorsData, pluginsData] = await Promise.all([
        connectorsRes.json(),
        pluginsRes.json(),
      ]) as [ConnectorsResponse, ConnectorPlugin[]];

      setConnectors(connectorsData);
      setPlugins(pluginsData);
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const connectorEntries = connectors ? Object.entries(connectors) : [];

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <h2>Active Connectors</h2>
          <button type="button" className="refreshButton" onClick={() => void fetchData()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {!loading && connectorEntries.length === 0 && (
          <div className="empty">No connectors running.</div>
        )}
        <div className="grid">
          {connectorEntries.map(([name, entry]) => (
            <ConnectorCard key={name} name={name} entry={entry} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2>Available Plugins</h2>
        </div>
        {!loading && plugins?.length === 0 && (
          <div className="empty">No plugins found.</div>
        )}
        <div className="grid">
          {plugins?.filter(plugin => plugin.type === 'source').map(plugin => (
            <PluginCard key={plugin.class} {...plugin} onClick={() => setSelectedPlugin(plugin)} />
          ))}
        </div>
      </section>

      {selectedPlugin && (
        <ConnectorFormModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onCreated={() => { void fetchData(); }}
        />
      )}
    </div>
  );
}