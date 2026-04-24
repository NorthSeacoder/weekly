import type { AiMetadata, ImageSource } from './ai';

export type StructuredContent =
    | string
    | number
    | boolean
    | null
    | StructuredContent[]
    | {[key: string]: StructuredContent | undefined};

export type WeeklyPost = {
    content?: StructuredContent;
    tags: string[];
    category?: string;
    source: string[];
    date: string | Date;
    title: string;
    id?: string;
    slug?: string;
    permalink: string;
    readingTime?: string;
    wordCount?: number;
    lastUpdated?: string;
    screenshot_api?: 'ScreenshotLayer' | 'HCTI' | 'manual';
    sections: Section[];
    desc?:string;
    cover?:string;
};
export type Section = {
    content: StructuredContent;
    tags: string[];
    category?: string;
    source?: string;
    source_url?: string;
    title?: string;
    summary?: string;
    description?: string;
    image_url?: string;
    image_source?: ImageSource;
    image_width?: number | null;
    image_height?: number | null;
    original_score?: number | null;
    summary_score?: number | null;
    ai_metadata?: AiMetadata | unknown | null;
    wordCount?: number;
    readingTime?: number | string;
    screenshot_api?: 'ScreenshotLayer' | 'HCTI' | 'manual';
};

export type PostsByMonth = string[];
