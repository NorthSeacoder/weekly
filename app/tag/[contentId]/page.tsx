import {getContent, getContents} from '@/lib/content';
import Comments from '@/components/Comments';
import dayjs from 'dayjs';
import {MDXRemote} from 'next-mdx-remote/rsc';
import {siteConfig} from '@/config/site';
import type {CardInfo} from '@/types/content';
import {notFound} from 'next/navigation';
import MDXComponents from '@/components/mdx/MDXComponents';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypePrettyCode from 'rehype-pretty-code';
import {Separator} from '@/components/ui/separator';
type Props = {
    params: {
        contentId: string;
    };
};
const options = {
    parseFrontmatter: true,
    mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
            [
                rehypePrettyCode,
                {
                    keepBackground: false,
                    defaultLang: {
                        block: 'typescript',
                        inline: 'javascript'
                    }
                }
            ]
        ]
    }
};

export async function generateMetadata({params}: Props) {
    const {contentId} = params;
    const post: CardInfo = await getContent(contentId);

    return {
        ...siteConfig,
        title: `${post?.metadata?.title ?? '404'} | ${siteConfig.name}`
    };
}
export async function generateStaticParams() {
    const posts: CardInfo[] = await getContents();
    return posts.map((post) => ({
        contentId: post.metadata.contentId
    }));
}
export default async function ContentDetailsPage({params}: Props) {
    const {contentId} = params;
    const post: CardInfo = await getContent(contentId);
    if (!post) {
        notFound();
    }
    const {
        content,
        metadata: {title, date,lastUpdated}
    } = post;

    return (
        <div className='w-full pt-12'>
            <div className='w-full md:w-3/5 px-6 mx-auto'>
                <article id={`article`}>
                    <h1>{title}</h1>
                    <MDXRemote source={content} components={MDXComponents} options={options as any} />
                </article>
                <Separator className='my-12 bg-gray-600' />
                <div className='flex justify-between'>
                    <div>发布时间：{dayjs(date).format('YYYY-MM-DD')}</div>
                    <div>最后更新时间：{dayjs(lastUpdated).format('YYYY-MM-DD')}</div>
                </div>
                <Comments />
            </div>
        </div>
    );
}
