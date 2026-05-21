import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import type { ConnectorsResponse, ConnectorPlugin, ConnectorEntry } from '../types/connect';
import { fetchConnectors, fetchPlugins } from '../api/connectApi';
import { useToast } from './ToastContext';

interface ConnectContextValue {
  sinks: ConnectorEntry[];
  collectors: ConnectorEntry[];
  plugins: ConnectorPlugin[] | null;
  loading: boolean;
  refresh: () => void;
}

const ConnectContext = createContext<ConnectContextValue | null>(null);

export const ConnectProvider: FC<PropsWithChildren> = ({ children }) => {
  const [sinks, setSinks] = useState<ConnectorEntry[]>([]);
  const [collectors, setCollectors] = useState<ConnectorEntry[]>([]);
  const [plugins, setPlugins] = useState<ConnectorPlugin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();


  const getCollectors = (response:ConnectorsResponse): ConnectorEntry[] =>
    Object.entries(response).filter(([_, entry]) => entry.info.type === "source").map(([_, entry]) => entry)

  const getSinks = (response:ConnectorsResponse): ConnectorEntry[] =>
    Object.entries(response).filter(([_, entry]) => entry.info.type === "sink").map(([_, entry]) => entry)


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connectorsData, pluginsData] = await Promise.all([
        fetchConnectors(),
        fetchPlugins(),
      ]);
      if (connectorsData) {
        setCollectors(getCollectors(connectorsData));
        setSinks(getSinks(connectorsData))
      } else {
        setCollectors([])
        setSinks([])
      }
      setPlugins(pluginsData);
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to load Kafka Connect data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const value = useMemo(
    () => ({ sinks, collectors, plugins, loading, refresh: () => { void load(); } }),
    [sinks, collectors, plugins, loading, load],
  );

  return <ConnectContext value={value}>{children}</ConnectContext>;
};

export function useConnect(): ConnectContextValue {
  const ctx = use(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
}