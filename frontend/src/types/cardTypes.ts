import type { ConnectorEntry, ConnectorPlugin } from "./connect.ts";

interface CardProps {
  cardType: CardType;
}

export interface CollectorCardProps extends CardProps {
  cardType: 'collector';
  entry: ConnectorEntry;
}

export interface PluginCardProps extends ConnectorPlugin, CardProps {
  cardType: 'plugin';
  onClick: () => void;
}

export interface SinkCardProps extends CardProps {
  cardType: 'sink';
  entry: ConnectorEntry;
}



export type CardType = 'plugin' | 'collector' | 'sink';
export type CardsData = CollectorCardProps[] | PluginCardProps[] | SinkCardProps[];

