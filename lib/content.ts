import type {CardInfo} from '@/types/content';

export const getContents = async () => {
    // 获取当前环境的 URL
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL;

    const res = await fetch(`${baseUrl}/api/content`, {
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch content');
    }

    const {content} = await res.json();
    return content;
};

export const getContent = async (contentId: string) => {
    const contents = await getContents();
    return contents.find(({metadata}: CardInfo) => metadata.contentId === contentId);
};

export const getTagGroup = async () => {
    // 获取当前环境的 URL
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL;

    const res = await fetch(`${baseUrl}/api/tag`, {
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch tag group');
    }

    const {data} = await res.json();
    return data;
};
