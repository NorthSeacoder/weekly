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
    readingTime?: string;
    wordCount?: number;
    lastUpdated?: string;
    screenshot_api?: 'ScreenshotLayer' | 'HCTI' | 'manual';
    sections: Section[];
};
export type Section = {
    content: string;
    tags: string[];
    category?: string;
    source?: string;
    screenshot_api?: 'ScreenshotLayer' | 'HCTI' | 'manual';
};

export type PostsByMonth = string[];
