'use client';

import TagCard from '@/components/tag-card';
import TagSelect from '@/components/tag-select';
import { Separator } from "@/components/ui/separator";
import SpotlightCard from '@/components/ui/spotlight-card';
import { useEffect, useRef, useState } from 'react';

interface TagContent {
    tag: string;
    contents: any[];
}

const LoadingPlaceholder = () => (
    <div className="animate-pulse space-y-8">
        <div className="h-32 bg-gray-800/50 rounded-xl"></div>
        <div className="h-32 bg-gray-800/50 rounded-xl"></div>
        <div className="h-32 bg-gray-800/50 rounded-xl"></div>
    </div>
);

const TagList = ({ data, selected }: { data: TagContent[], selected: string[] }) => {
    const filteredData = data.filter(({tag}) => 
        selected.length === 0 || selected.includes(tag)
    );

    return (
        <div className='grid gap-8'>
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
};

export default function TagHome() {
    const [data, setData] = useState<TagContent[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [selected, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [prevSelectedCount, setPrevSelectedCount] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/tag');
                const result = await response.json();
                if (result.code === 200 && result.data) {
                    const tagData = result.data.map((item: any) => ({
                        tag: item.tag,
                        contents: item.contents || []
                    }));
                    setData(tagData);
                    setTags(tagData.map((item: TagContent) => item.tag));
                }
            } catch (error) {
                console.error('Error fetching tag data:', error);
                setData([]);
                setTags([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleChange = (selectedTags: string[]) => {
        const currentSelectedCount = selectedTags.length;
        
        if (currentSelectedCount === 0 && prevSelectedCount > 0) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentSelectedCount === 1 && prevSelectedCount === 0) {
            contentRef.current?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }

        setPrevSelectedCount(currentSelectedCount);
        setSelectedTags(selectedTags);
    };

    return (
        <div className='flex flex-row w-full pt-6'>
            <div className='hidden md:block md:w-1/4 pl-6'>
                <div className="sticky top-20">
                    <h2 className="text-xl font-bold mb-4 text-gray-200">标签筛选</h2>
                    <TagSelect tags={tags} onChange={handleChange} />
                </div>
            </div>
            <div ref={contentRef} className='w-full md:w-3/4 px-6'>
                {loading ? (
                    <LoadingPlaceholder />
                ) : (
                    <TagList data={data} selected={selected} />
                )}
            </div>
        </div>
    );
}
