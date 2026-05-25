import type { FC } from "react";
import type { CardsData } from "../types";
import ConnectorCard from "./cards/ConnectorCard.tsx";
import PluginCard from "./cards/PluginCard.tsx";
import TopicCard from "./cards/TopicCard.tsx";
import { isPluginCard, isConnectorCard, isTopicCard } from "../utils";

type CardGridProps = {
  cardsData: CardsData;
};

const CardGrid: FC<CardGridProps> = ({ cardsData }) => {
  return (
    <div className="grid">
      {cardsData.map((data, i) => {
        if (isPluginCard(data))    return <PluginCard    key={i} {...data} />;
        if (isConnectorCard(data)) return <ConnectorCard key={i} {...data} />;
        if (isTopicCard(data))     return <TopicCard     key={i} {...data} />;
      })}
    </div>
  );
};

export default CardGrid;