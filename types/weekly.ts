export type WeeklyPost = {
    content: string;
    tags: string[];
    category?: string;
    source: string[];
    id: string;
    slug: string;
    date: string;
    title: string;
};

export type PostsByMonth = string[];
