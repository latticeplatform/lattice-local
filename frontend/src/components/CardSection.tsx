import type { FC } from "react";
import type { CardsData } from "../types/cardTypes.ts";
import CardGrid from "./CardGrid.tsx";



interface CardSectionProps {
  title: string;
  data: CardsData;
  onRefresh?: () => void;
  loading?: boolean;
}

const CardSection:FC<CardSectionProps> = ({title, data, onRefresh, loading }) => (
  <section className="section">
    <div className="sectionHeader">
      <h2>{title}</h2>
      {onRefresh && <button type="button" className="refreshButton" onClick={() => onRefresh()} disabled={loading}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>}
    </div>
    {data.length === 0 && (
      <div className="empty">{loading ? 'loading...' : 'none available'}</div>
    )}
    <CardGrid cardsData={data}/>
  </section>
)


export default CardSection;