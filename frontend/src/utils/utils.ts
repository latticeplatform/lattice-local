import type { CollectorCardProps, SinkCardProps, PluginCardProps, TopicCardProps } from "../types/cardTypes.ts";


export const isPluginCard = (card: unknown): card is PluginCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'plugin';
}

export const isCollectorCard = (card: unknown): card is CollectorCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'source';
}

export const isSinkCard = (card: unknown): card is SinkCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'sink';
}

export const isTopicCard = (card: unknown): card is TopicCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'topic';
}

export const groupByKey = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {

  return items
  .slice()
  .sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  })
  .reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);