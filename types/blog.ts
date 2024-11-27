export interface BlogPost {
    title: string;
    slug: string;
    date: string;
    content: string;
    metadata: {
        title: string;
        slug: string;
        date: string;
        visible?: string;
        category?: string;
        tags?: string[];
    };
}
