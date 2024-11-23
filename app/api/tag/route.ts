import {getContents} from '@/lib/content';

export async function GET() {
    try {
        const contents = await getContents();
        // 按标签组织内容
        const tagMap = new Map();

        contents.forEach((item) => {
            item.metadata.tags.forEach((tag: string) => {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, {
                        tag,
                        contents: []
                    });
                }
                tagMap.get(tag).contents.push(item);
            });
        });

        // 转换为数组并排序
        const tagData = Array.from(tagMap.values()).sort((a, b) => b.contents.length - a.contents.length);

        return Response.json({
            code: 200,
            data: tagData
        });
    } catch (error) {
        console.error('Error in tag API:', error);
        return Response.json({
            code: 500,
            error: 'Internal Server Error',
            data: []
        });
    }
}
