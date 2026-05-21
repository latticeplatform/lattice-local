import type { ConnectorEntry, ConnectorPlugin } from "./connect.ts";

interface CardProps {
  cardType: CardType;
}

export interface CollectorCardProps extends CardProps {
  cardType: 'source';
  entry: ConnectorEntry;
  onClick: () => void;
}

export interface PluginCardProps extends ConnectorPlugin, CardProps {
  cardType: 'plugin';
  onClick: () => void;
}

export interface SinkCardProps extends CardProps {
  cardType: 'sink';
  entry: ConnectorEntry;
  onClick: () => void;
}



export interface TopicCardProps extends CardProps {
  cardType: 'topic';
  name: string;
  sourceConnector: string;
  onClick: () => void;
}

export type CardType = 'plugin' | 'source' | 'sink' | 'topic';
export type CardsData = CollectorCardProps[] | PluginCardProps[] | SinkCardProps[] | TopicCardProps[];

