import {getCachedData} from '@/lib/cache';
import {handleDir} from '@/lib/file';
import path from 'path';

const blogsDir = path.join(process.cwd(), 'blogs');

export function getBlogs() {
    return getCachedData(
        'blog-posts',
        () => {
            try {
                const content = handleDir(blogsDir);
                if (!content || content.length === 0) {
                    console.warn('No blogs found in directory');
                    return {posts: []};
                }
                return {posts: content};
            } catch (error) {
                console.error('Error getting blogs:', error);
                return {posts: []};
            }
        },
        {debug: true}
    );
}
