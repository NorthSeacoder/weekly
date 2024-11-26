import {handleDir} from '@/lib/file';
import path from 'path';
const contentDir = path.join(process.cwd(), 'sections');

function generateTagGroup(content: any[]) {
    if (!Array.isArray(content)) {
        console.error('Invalid content format:', content);
        return [];
    }

    const tagMap = new Map();

    content.forEach((item) => {
        if (item.metadata?.tags) {
            item.metadata.tags.forEach((tag: string) => {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, 0);
                }
                tagMap.set(tag, tagMap.get(tag) + 1);
            });
        }
    });

    return Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({tag, count}));
}

export async function GET() {
    try {
        console.log('Attempting to read content from:', contentDir);

        if (!contentDir) {
            throw new Error('Content directory path is not defined');
        }

        const content = handleDir(contentDir);

        if (!content || content.length === 0) {
            console.warn('No content found in directory');
            return Response.json({content: [], tagGroup: []});
        }

        const tagGroup = generateTagGroup(content);

        return Response.json({content, tagGroup});
    } catch (error) {
        console.error('Error generating content:', error);
        console.error('Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
            contentDir
        });
        return Response.json(
            {
                error: 'Failed to generate content',
                details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
            },
            {status: 500}
        );
    }
}
