export async function getBlogs() {
    // 获取当前环境的 URL
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = process.env.VERCEL_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const res = await fetch(`${baseUrl}/api/blogs`, {
        cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'force-cache'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch blogs');
    }

    const {content} = await res.json();
    return {posts: content};
}
