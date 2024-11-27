'use client';

import TagList from '@/components/tag-list';
import TagSelect from '@/components/tag-select';
import { useState } from 'react';

interface TagContent {
    tag: string;
    contents: any[];
}

interface TagClientProps {
    tagData: TagContent[];
}

export default function TagClient({ tagData }: TagClientProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const tags = tagData.map(item => item.tag);

    return (
        <div className='flex flex-row w-full pt-6'>
            <div className='hidden md:block md:w-1/4 pl-6'>
                <div className="sticky top-20">
                    <h2 className="text-xl font-bold mb-4 text-gray-200">标签筛选</h2>
                    <TagSelect 
                        tags={tags} 
                        onTagsChange={setSelectedTags} 
                    />
                </div>
            </div>
            <div id="tag-content" className='w-full md:w-3/4 px-6'>
                <TagList 
                    data={tagData} 
                    selectedTags={selectedTags} 
                />
            </div>
        </div>
    );
} 