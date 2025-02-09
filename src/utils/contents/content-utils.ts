import {getCollection,render} from 'astro:content';
import type {CollectionEntry,RenderResult} from 'astro:content';
import {collections} from '@/src/content/config';

export type EnhancedEntry<T extends keyof typeof collections> = CollectionEntry<T> & {
    lastUpdated: Date;
    wordCount: number;
};

export async function getEnhancedCollection<T extends keyof typeof collections>(
    collection: T
): Promise<EnhancedEntry<T>[]> {
    const rawEntries = await getCollection(collection);

    return Promise.all(
        rawEntries.map(async (entry) => {
            const fileUrl = new URL(entry.id, import.meta.url);
            const lastUpdated = await getLastUpdatedTime(fileUrl.href);
            const wordCount = countWords(entry.body ?? '');
            return {
                ...entry,
                data: {
                    ...entry.data,
                    lastUpdated,
                    wordCount
                },
            } as EnhancedEntry<T>;
        })
    );
}

// 实现平台无关的最后更新时间获取
async function getLastUpdatedTime(fileUrl: string): Promise<Date> {
    if (import.meta.env.DEV) {
        // 开发环境：使用浏览器 Fetch API 获取文件元信息
        try {
            const res = await fetch(fileUrl, {method: 'HEAD'});
            const lastModified = res.headers.get('last-modified');
            return lastModified ? new Date(lastModified) : new Date();
        } catch {
            return new Date();
        }
    }

    // 生产环境：使用构建时注入的时间
    return new Date(import.meta.env.BUILD_TIME || Date.now());
}

// 字数统计辅助函数
function countWords(content: string): number {
    const plainText = content.replace(/[#*`-]/g, '');
    return plainText.split(/\s+/).filter(Boolean).length;
}
