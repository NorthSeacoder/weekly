import {PostsByMonth, WeeklyPost} from '@/types/weekly';
import dayjs, {Dayjs} from 'dayjs';
import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

// export async function getWeeklyPosts(): Promise<{posts: WeeklyPost[]; postsByMonth: PostsByMonth}> {
//     const postsDirectory = path.join(process.cwd(), 'content');
//     let filenames = await fs.promises.readdir(postsDirectory);
//     filenames = filenames.reverse();

//     const posts = await Promise.all(
//         filenames.map(async (filename) => {
//             const fullPath = path.join(postsDirectory, filename);
//             const fileContents = await fs.promises.readFile(fullPath, 'utf8');

//             const {data, content} = matter(fileContents);
//             // console.log(data,content)
//             const month = dayjs(data.date).format('YYYY-MM-DD').slice(0, 7);

//             return {
//                 id: month,
//                 metadata: data, // slug/url title date
//                 title: data.title,
//                 slug: data.slug,
//                 content
//             };
//         })
//     );

//     // Group by month
//     const postsByMonth: PostsByMonth = posts.reduce((acc: PostsByMonth, post: WeeklyPost) => {
//         const month = dayjs(post.metadata.date).format('YYYY-MM-DD').slice(0, 7);
//         if (!acc[month]) {
//             acc[month] = [];
//         }
//         acc[month].push(post);
//         return acc;
//     }, {});

//     return {
//         posts,
//         postsByMonth
//     };
// }
interface Metadata {
    tags: string[];
    source: string;
    date: string;
}

interface DataItem {
    metadata: Metadata;
    content: string;
}


function processData(data: DataItem[]): {posts: WeeklyPost[]; postsByMonth: PostsByMonth} {
    // 获取一周的开始和结束日期
    const getWeekRange = (date: Dayjs): [Dayjs, Dayjs] => {
        const startOfWeek = date.startOf('week');
        const endOfWeek = date.endOf('week');
        return [startOfWeek, endOfWeek];
    };

    // 按周组织数据
    const weeklyData = data.reduce<Record<string, DataItem[]>>((acc, item) => {
        const date = dayjs(item.metadata.date);
        const [startOfWeek, endOfWeek] = getWeekRange(date);
        const weekKey = `${startOfWeek.format('YYYY-MM-DD')} to ${endOfWeek.format('YYYY-MM-DD')}`;

        if (!acc[weekKey]) {
            acc[weekKey] = [];
        }
        acc[weekKey].push(item);
        return acc;
    }, {});

    const posts: WeeklyPost[] = [];
    const postsByMonth: string[] = [];
    const baseDate = dayjs('2024-07-07');

    Object.keys(weeklyData)
        .sort()
        .forEach((week) => {
            const items = weeklyData[week];
            const contentParts: string[] = [];
            const tags: Set<string> = new Set();
            const source: Set<string> = new Set();

            items.forEach((item) => {
                contentParts.push(item.content);
                item.metadata.tags.forEach((tag) => tags.add(tag));
                source.add(item.metadata.source);
            });

            const [startOfWeek, endOfWeek] = week.split(' to ');
            const startOfWeekDate = dayjs(startOfWeek);
            const month = startOfWeekDate.format('YYYY-MM');
            const weekNumber = Math.floor(startOfWeekDate.diff(baseDate, 'week')) + 1;
            postsByMonth.push(month);
            posts.push({
                content: contentParts.join(''),
                tags: Array.from(tags),
                source: Array.from(source),
                id: month,
                slug: `${weekNumber}`,
                date: endOfWeek,
                title: `我不知道的周刊第 ${weekNumber} 期`
            });
        });

    return {posts, postsByMonth};
}
export async function generateWeeklyPosts() {
    const postsDirectory = path.join(process.cwd(), 'sections');
    let filenames = await fs.promises.readdir(postsDirectory);
    const sections: DataItem[] = await Promise.all(
        filenames.map(async (filename) => {
            const fullPath = path.join(postsDirectory, filename);
            const fileContents = await fs.promises.readFile(fullPath, 'utf8');

            const {data, content} = matter(fileContents);

            return {
                metadata: data,
                content
            } as DataItem;
        })
    );
    return processData(sections);
}
