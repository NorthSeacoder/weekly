import type {CardInfo} from '@/types/content';

export const getContents = async () => {
    // 获取当前环境的 URL
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

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
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = process.env.NEXT_PUBLIC_SITE_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/tag`, {
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch tag group');
    }

    const {data} = await res.json();
    return data;
};
