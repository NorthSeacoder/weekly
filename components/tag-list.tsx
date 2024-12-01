'use client';

import CardGrid from '@/components/card-grid';

interface TagContent {
    tag: string;
    contents: any[];
}

interface TagListProps {
    data: TagContent[];
    selectedTags: string[];
}

export default function TagList({ data, selectedTags }: TagListProps) {
    const filteredData = selectedTags.length === 0 
        ? data 
        : data.filter(({ tag }) => selectedTags.includes(tag));

    return (
        <div className='grid gap-8 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4'>
            {filteredData.map(({tag, contents}) => (
                <CardGrid key={tag} title={tag} infoList={contents} />
            ))}
        </div>
    );
} 