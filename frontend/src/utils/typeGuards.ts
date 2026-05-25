import type { ConnectorCardProps, PluginCardProps, TopicCardProps } from "../types";

export const isPluginCard = (card: unknown): card is PluginCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'plugin';
}

export const isConnectorCard = (card: unknown): card is ConnectorCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && (card.cardType === 'source' ||  card.cardType === 'sink') ;
}


export const isTopicCard = (card: unknown): card is TopicCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'topic';
}
