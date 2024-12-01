import { Card } from '@/components/ui/card';
import { useCardInteraction } from '@/hooks/useCardInteraction';
import type { CardInfo } from '@/types/content';
import React from 'react';
import TechCard from './teach-card';

interface TagCardProps {
  title: string;
  infoList: CardInfo[];
}

const CardGrid: React.FC<TagCardProps> = ({ title, infoList }) => {
  const { mousePosition, handleMouseMove, handleMouseLeave } = useCardInteraction()

  return (
    <div 
      className="bg-background px-8 "
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto">
        <Card className="bg-background/50 border-border backdrop-blur-sm p-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-200 tracking-wider">
            {title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {infoList.map(({metadata}) => (
              <TechCard
                key={metadata.contentId}
                id={metadata.contentId}
                title={metadata.title}
                tags={metadata.tags}
                mousePosition={mousePosition}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
export default CardGrid