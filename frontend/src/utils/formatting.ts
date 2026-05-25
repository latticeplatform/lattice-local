
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

