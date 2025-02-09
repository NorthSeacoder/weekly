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
    wordCount?: number;
    lastUpdated?: string;
    sections: Section[];
};
export type Section = {
    content: string;
    tags: string[];
    category?: string;
    source?: string;
};

export type PostsByMonth = string[];
