import {getTagGroup} from '@/lib/content';
import TagCard from '@/components/tag-card';
export default async function TagHome() {
    const data = await getTagGroup();
    console.log(data);
    return (
        <div className='flex flex-row w-full pt-0'>
            <div className='hidden md:block md:w-1/5 pl-6'>side</div>
            <div className='w-full md:w-3/5 px-6'>
                <div className='grid gap-4'>
                    {data.map(({tag, contents}: any) => (
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
