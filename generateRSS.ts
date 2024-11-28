import dotenv from 'dotenv';
import {Feed} from 'feed';
import fs from 'fs';
import {remark} from 'remark';
import gemoji from 'remark-gemoji';
import html from 'remark-html';
import {getWeeklyPosts} from './lib/weekly';

dotenv.config({path: './.env'});

// 使用已有的环境变量和站点配置
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME;
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME;
const SITE_DESCRIPTION = process.env.NEXT_PUBLIC_SITE_DESCRIPTION;

const markdownToHtml = (markdown: string) => remark().use(html).use(gemoji).processSync(markdown).toString();

const generateRssFeed = async () => {
    const author = {
        name: AUTHOR_NAME,
        link: SITE_URL
    };
    const posts = await getWeeklyPosts();

    const latestPosts = posts.slice(0, 12).filter((i) => i);
    const feed = new Feed({
        title: SITE_NAME as string,
        description: SITE_DESCRIPTION,
        id: SITE_URL,
        link: SITE_URL,
        generator: SITE_URL,
        feedLinks: {
            rss2: `${SITE_URL}/rss.xml`
        },
        author,
        copyright: `Copyright © ${new Date().getFullYear()} by ${AUTHOR_NAME}`
    });

    latestPosts.forEach((post) => {
        feed.addItem({
            title: post.title,
            id: `${SITE_URL}/weekly/${post.slug}`,
            link: `${SITE_URL}/weekly/${post.slug}`,
            description: post.title || '',
            content: markdownToHtml(post.content),
            date: new Date(post.date),
            author: [author]
        });
    });

    fs.writeFileSync(`./out/rss.xml`, feed.rss2(), 'utf8');
};

generateRssFeed();
