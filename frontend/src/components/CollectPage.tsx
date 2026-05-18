import { useEffect, useState, useCallback } from 'react';
import type { ConnectorsResponse, ConnectorPlugin, ConnectorState } from '../types/connect';
import './CollectPage.css';
import { useToast } from "../context/ToastContext.tsx";

export default function CollectPage() {
  const [connectors, setConnectors] = useState<ConnectorsResponse | null>(null);
  const [plugins, setPlugins] = useState<ConnectorPlugin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectorsRes, pluginsRes] = await Promise.all([
        fetch('/api/connectors'),
        fetch('/api/connector-plugins'),
      ]);

      if (!connectorsRes.ok || !pluginsRes.ok) {
        throw new Error('Failed to fetch from Kafka Connect');
      }

      const [connectorsData, pluginsData] = await Promise.all([
        connectorsRes.json() as Promise<ConnectorsResponse>,
        pluginsRes.json() as Promise<ConnectorPlugin[]>,
      ]);

      setConnectors(connectorsData);
      setPlugins(pluginsData);
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const connectorEntries = connectors ? Object.entries(connectors) : [];

  return (
    <div className="page">

      <section className="section">
        <div className="sectionHeader">
          <h2>Active Connectors</h2>
          <button className="refreshButton" onClick={() => void fetchData()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {connectorEntries.length === 0 && (
          <div className={"empty"}>{"No connectors running."}</div>
        )}

        <div className="grid">
          {connectorEntries.map(([name, entry]) => (
            <div key={name} className="card">
              <div className="cardHeader">
                <span className="cardName">{name}</span>
                <span className="badge">{entry.status.type}</span>
              </div>
              <ConnectorStateRow state={entry.status.connector.state} />
              {entry.status.tasks.length > 1 && (
                <span style={{ fontSize: 12, color: 'var(--text)' }}>
                  {entry.status.tasks.filter(t => t.state === 'RUNNING').length}/
                  {entry.status.tasks.length} tasks running
                </span>
              )}
            </div>
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
          {plugins?.map((plugin) => (
            <div key={plugin.class} className="card">
              <div className="cardHeader">
                <span className="badge">{plugin.type}</span>
                <span style={{ fontSize: 11, color: 'var(--text)' }}>v{plugin.version}</span>
              </div>
              <span className="pluginClass" title={plugin.class}>
                {plugin.class.split('.').pop()}
              </span>
              <span className="pluginClass" style={{ fontSize: 11, opacity: 0.6 }}>
                {plugin.class}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ConnectorStateRow({ state }: { state: ConnectorState }) {
  return (
    <div className="stateRow">
      <span className="dot" data-state={state} />
      {state}
    </div>
  );
}