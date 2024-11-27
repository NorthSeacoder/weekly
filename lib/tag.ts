import {getCachedData} from '@/lib/cache';
import {handleDir} from '@/lib/file';
import path from 'path';

const contentDir = path.join(process.cwd(), 'sections');

export function getTagData() {
    return getCachedData(
        'tag-data',
        () => {
            try {
                const contents = handleDir(contentDir);
                const tagMap = new Map();

                contents.forEach((item: any) => {
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

                return Array.from(tagMap.values()).sort((a, b) => b.contents.length - a.contents.length);
            } catch (error) {
                console.error('Error getting tag data:', error);
                return [];
            }
        },
        {debug: true}
    );
}
