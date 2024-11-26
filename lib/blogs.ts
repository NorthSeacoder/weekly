export async function getBlogs() {
    // 获取当前环境的 URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/blogs`, {
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch blogs');
    }

    const {content} = await res.json();
    return {posts: content};
}
