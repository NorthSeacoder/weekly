import {handleDir} from '@/lib/file';
import path from 'path';
const contentDir = path.join(process.cwd(), 'sections');

function generateTagGroup(content: any[]) {
    const tagMap = new Map();

    content.forEach((item) => {
        item.metadata.tags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
                tagMap.set(tag, 0);
            }
            tagMap.set(tag, tagMap.get(tag) + 1);
        });
    });

    return Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => ({tag, count}));
}

export async function GET() {
    try {
        const content = handleDir(contentDir);
        const tagGroup = generateTagGroup(content);

        return Response.json({content, tagGroup});
    } catch (error) {
        console.error('Error generating content:', error);
        return Response.json({error: 'Failed to generate content'}, {status: 500});
    }
}
