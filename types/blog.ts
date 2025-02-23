export type BlogPost = {
    content: string | unknown;
    tags: string[];
    category?: string;
    date: string | Date;
    title: string;
    desc: string;
    id?: string;
    slug: string;
    permalink: string;
    readingTime?: string;
    wordCount?: number;
    lastUpdated?: string;
};
