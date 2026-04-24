export type ImageSource = 'og' | 'twitter' | 'content' | 'default' | 'screenshot';

export interface OriginalScoring {
    relevance: number;
    quality: number;
    practicality: number;
    innovation?: number;
    overall: number;
    reasoning?: string;
    scored_at: string;
}

export interface SummaryScoring {
    accuracy: number;
    completeness: number;
    readability: number;
    appeal?: number;
    overall: number;
    issues?: string[];
    suggestions?: string;
    scored_at: string;
}

export interface AiMetadata {
    original_scoring?: OriginalScoring;
    summary_scoring?: SummaryScoring;
    suggested_category?: string;
    suggested_tags?: string[];
}

export interface ContentAiFields {
    original_score?: number | null;
    summary_score?: number | null;
    ai_metadata?: AiMetadata | null;
    image_url?: string | null;
    image_source?: ImageSource | null;
    image_width?: number | null;
    image_height?: number | null;
}

