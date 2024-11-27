'use client';

import TagCard from '@/components/tag-card';
import { Separator } from "@/components/ui/separator";
import SpotlightCard from '@/components/ui/spotlight-card';

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
                <div key={tag} className="relative">
                    <SpotlightCard>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className='text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent'>
                                    {tag}
                                    <span className="ml-2 text-sm text-gray-400">
                                        ({contents.length})
                                    </span>
                                </h2>
                            </div>
                            <Separator className="my-4" />
                            <div className="mt-4">
                                <TagCard infoList={contents} />
                            </div>
                        </div>
                    </SpotlightCard>
                </div>
            ))}
        </div>
    );
} 