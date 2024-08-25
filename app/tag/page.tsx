'use client';

import {useState, useEffect} from 'react';

import TagCard from '@/components/tag-card';
import TagSelect from '@/components/tag-select';
export default function TagHome() {
    const [data, setData] = useState<any[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [selected, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        console.log('useEffect called');
        const fetchData = async () => {
            const response = await fetch('/api/tag');
            const {data: result} = await response.json();
            setData(result);
            setTags(result.map(({tag}: {tag: string}) => tag));
        };

        fetchData();
    }, []);
    const handleChange = (selectedTags: string[]) => {
        setSelectedTags(selectedTags);
    };
    return (
        <div className='flex flex-row w-full pt-0'>
            <div className='hidden md:block md:w-1/4 pl-6'>
                <TagSelect tags={tags} onChange={handleChange} />
            </div>
            <div className='w-full md:w-3/4 px-6'>
                <div className='grid gap-4'>
                    {data
                        .filter(({tag}: {tag: string}) => {
                            return selected.length === 0 || selected.includes(tag);
                        })
                        .map(({tag, contents}: any) => (
                            <div key={tag}>
                                <h2 className='font-display text-2xl font-semibold'>{tag}</h2>
                                <TagCard infoList={contents} />
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
