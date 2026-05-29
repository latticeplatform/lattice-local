import type { FC, PropsWithChildren } from 'react';


interface DetailSectionProps extends PropsWithChildren {
  title: string;
}

const DetailSection: FC<DetailSectionProps> = ({title, children}) => {
  return (
    <div className="detail-section">
      <p className="detail-section-title">{title}</p>
      {children}
    </div>
  );
};

export default DetailSection;