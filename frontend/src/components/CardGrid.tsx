import type { FC } from "react";
import type { CardsData } from "../types/cardTypes.ts";
import CollectorCard from "./cards/CollectorCard.tsx";
import PluginCard from "./cards/PluginCard.tsx";
import SinkCard from "./cards/SinkCard.tsx";
import TopicCard from "./cards/TopicCard.tsx";
import { isPluginCard, isCollectorCard, isSinkCard, isTopicCard } from "../utils/utils.ts";

type CardGridProps = {
  cardsData: CardsData;
};

const CardGrid: FC<CardGridProps> = ({ cardsData }) => {
  return (
    <div className="grid">
      {cardsData.map((data, i) => {
        if (isPluginCard(data))    return <PluginCard    key={i} {...data} />;
        if (isCollectorCard(data)) return <CollectorCard key={i} {...data} />;
        if (isSinkCard(data))      return <SinkCard      key={i} {...data} />;
        if (isTopicCard(data))     return <TopicCard     key={i} {...data} />;
      })}
    </div>
  );
};

export default CardGrid;