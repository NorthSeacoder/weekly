export type WeeklyPost = {
    content: string;
    tags: string[];
    category?: string;
    source: string[];
    date: string|Date;
    title: string;
    id?: string;
    slug?: string;
    permalink: string;
    readingTime?: number;
};

export type PostsByMonth = string[];
