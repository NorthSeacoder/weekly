export interface Metadata {
    tags: string[];
    category: string;
    source: string;
    date: string;
    title: string;
    contentId: string;
    lastUpdated: string;
}
export interface CardInfo {
    metadata: Metadata;
    content: string;
}
