import type { CollectorCardProps, SinkCardProps, PluginCardProps } from "./types/cardTypes.ts";


export const isPluginCard = (card: unknown): card is PluginCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'plugin';
}

export const isCollectorCard = (card: unknown): card is CollectorCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'collector';
}

export const isSinkCard = (card: unknown): card is SinkCardProps => {
  return typeof card === 'object' && card !== null && 'cardType' in card && card.cardType === 'connector';
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
