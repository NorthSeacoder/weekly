'use client';

import { cn } from '@/lib/utils';
import type { CardInfo } from '@/types/content';
import { useTransitionRouter } from 'next-view-transitions';

const Tag = ({ text }: { text: string }) => (
    <span
        className={cn(
            'inline-flex items-center py-0.5 rounded-lg text-sm font-medium',
            'border border-stone-300 text-stone-200 px-1 m-1'
        )}>
        {text}
    </span>
);

interface TagCardProps {
    infoList: CardInfo[];
}

const TagCard: React.FC<TagCardProps> = ({ infoList }) => {
    const router = useTransitionRouter();

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {infoList.map((cardInfo) => (
                <div
                    key={`${cardInfo.metadata.date}-${cardInfo.metadata.title}`}
                    onClick={() => router.push(`/tag/${cardInfo.metadata.contentId}`)}
                    className="relative h-full p-3 pb-4 rounded-lg border border-gray-800 bg-black/50 backdrop-blur-sm cursor-pointer
                             hover:bg-black/70 transition-all duration-200">
                    <div className="flex flex-col h-full items-center text-center">
                        <div className="grow mb-5">
                            <h5 className="text-xl text-slate-200 font-bold mb-5">{cardInfo.metadata.title}</h5>
                            <div className="flex flex-wrap justify-center">
                                {cardInfo.metadata.tags.map((tag) => (
                                    <Tag key={`${cardInfo.metadata.date}-${cardInfo.metadata.title}-${tag}`} text={tag} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TagCard;
