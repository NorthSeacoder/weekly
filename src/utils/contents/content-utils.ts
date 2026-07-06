import {getCollection} from 'astro:content';
import type {CollectionEntry} from 'astro:content';
import {collections} from '@/src/content.config';

export type EnhancedEntry<T extends keyof typeof collections> = CollectionEntry<T> & {
    lastUpdated?: Date;
    wordCount: number;
};

export async function getEnhancedCollection<T extends keyof typeof collections>(
    collection: T
): Promise<EnhancedEntry<T>[]> {
    const rawEntries = await getCollection(collection);
    return Promise.all(
        rawEntries.map(async (entry) => {
            // const fileUrl = new URL(entry.id, import.meta.url);
            // const lastUpdated = await getLastUpdatedTime(fileUrl.href);
            // console.log('lastUpdated', lastUpdated) 
            const wordCount = countWords(entry.body ?? '');
            return {
                ...entry,
                data: {
                    ...entry.data,
                    // lastUpdated,
                    wordCount
                },
            } as EnhancedEntry<T>;
        })
    );
}

// 字数统计辅助函数
function countWords(content: string): number {
    const plainText = content.replace(/[#*`-]/g, '');
    return plainText.split(/\s+/).filter(Boolean).length;
}
