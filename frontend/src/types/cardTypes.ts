import type { ConnectorEntry, ConnectorPlugin } from "./connect.ts";

interface CardProps {
  cardType: CardType;
}

export interface ConnectorCardProps extends CardProps {
  cardType: 'source' | 'sink';
  entry: ConnectorEntry;
  onClick: () => void;
}

export interface PluginCardProps extends ConnectorPlugin, CardProps {
  cardType: 'plugin';
  onClick: () => void;
}


export interface TopicCardProps extends CardProps {
  cardType: 'topic';
  name: string;
  sourceConnector: string;
  onClick: () => void;
}

export type CardType = 'plugin' | 'source' | 'sink' | 'topic';
export type CardsData = ConnectorCardProps[] | PluginCardProps[] | TopicCardProps[];

