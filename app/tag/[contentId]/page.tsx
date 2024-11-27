import Comments from '@/components/Comments';
import MDXComponents from '@/components/mdx/MDXComponents';
import { Separator } from '@/components/ui/separator';
import { siteConfig } from '@/config/site';
import { getTagData } from '@/lib/tag';
import dayjs from 'dayjs';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

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

export function generateMetadata({params}: Props) {
    const {contentId} = params;
    const tagData = getTagData();
    const post = tagData
        .flatMap(item => item.contents)
        .find(content => content.metadata.contentId === contentId);

    return {
        ...siteConfig,
        title: `${post?.metadata?.title ?? '404'} | ${siteConfig.name}`
    };
}

export function generateStaticParams() {
    try {
        const tagData = getTagData();
        
        if (!tagData || !Array.isArray(tagData)) {
            console.error('Invalid tag data:', tagData);
            return [];
        }
        const post = tagData.flatMap(item => 
            item.contents.map((content:any) => ({
                contentId: content.metadata.contentId
            }))
        );

        console.log('Generating static params for tags:', post.length);
        return post.map((item) => {
            if (!item.contentId) {
                console.warn('Tag item missing contentId:', item);
                return null;
            }
            return {
                contentId: item.contentId,
            };
        }).filter(Boolean);
    } catch (error) {
        console.error('Error in tag generateStaticParams:', error);
        return [];
    }
}

export default function ContentDetailsPage({params}: Props) {
    const {contentId} = params;
    const tagData = getTagData();
    const post = tagData
        .flatMap(item => item.contents)
        .find(content => content.metadata.contentId === contentId);

    if (!post) {
        notFound();
    }

    const {
        content,
        metadata: {title, date, lastUpdated}
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
