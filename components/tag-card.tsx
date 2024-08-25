'use client';

import Spotlight, {SpotlightCard} from '@/components/ui/spotlight-card';
import {useTransitionRouter} from 'next-view-transitions';
import {cn} from '@/lib/utils';
import type {CardInfo} from '@/types/content';
// interface CardInfo {
//     metadata: {
//         tags: string[];
//         category: string;
//         source: string;
//         date: string;
//         title: string;
//         contentId: string;
//     };
//     content: string;
// }
const Tag = ({text}: any) => (
    <span
        className={cn(
            'inline-flex items-center py-0.5 rounded-lg text-sm font-medium',
            'border border-stone-300 text-stone-200 px-1 m-1'
        )}>
        {text}
    </span>
);
const SingleCard = ({cardInfo}: {cardInfo: CardInfo}) => {
    const {
        metadata: {title, contentId, date},
        content
    } = cardInfo;
    const router = useTransitionRouter();
    const handleClick = () => {
        router.push(`/tag/${contentId}`);
    };
    return (
        <SpotlightCard>
            {/* <Link className='p-1 h-full' href='tag/feature'> */}
            <div
                onClick={handleClick}
                className='relative h-full  p-3 pb-4 rounded-[inherit] z-20 overflow-hidden cursor-pointer'>
                <div className='flex flex-col h-full items-center text-center'>
                    <div className='grow mb-5'>
                        <h5 className='text-xl text-slate-200 font-bold mb-5 line-clamp-1'>{title}</h5>
                        <div className='flex flex-wrap max-w-50'>
                            {cardInfo.metadata.tags.map((tag) => (
                                <Tag key={`${date}-${title}-${tag}`} text={tag} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* </Link> */}
        </SpotlightCard>
    );
};
export default function TagCard({infoList}: {infoList: CardInfo[]}) {
    return (
        <Spotlight className='max-w-2xl mx-auto  columns-1 gap-2 space-y-2 sm:columns-2 md:columns-3 lg:columns-4 group'>
            {infoList.map((cardInfo) => (
                <SingleCard key={`${cardInfo.metadata.date}-${cardInfo.metadata.title}`} cardInfo={cardInfo} />
            ))}
        </Spotlight>
    );
}
