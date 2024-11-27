import Comments from "@/components/Comments";
import TOC from "@/components/TOC";
import WeeklyList from "@/components/WeeklyList";
import MDXComponents from "@/components/mdx/MDXComponents";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { getBlogs } from "@/lib/blogs";
import { BlogPost } from "@/types/blog";
import dayjs from "dayjs";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IoIosLink } from "react-icons/io";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type Props = {
  params: {
    slug: string;
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
            block: "typescript",
            inline: "javascript",
          },
        },
      ],
    ],
  },
};

export function generateMetadata({ params }: Props) {
  const { slug } = params;
  const { posts } = getBlogs();
  const post = posts.find((post: BlogPost) => post.metadata.slug === slug);

  return {
    ...siteConfig,
    title: `${post?.metadata.title || "404"} | ${siteConfig.name}`,
    openGraph: {
      ...siteConfig.openGraph,
      title: `${post?.metadata.title || "404"} | ${siteConfig.name}`,
    },
    twitter: {
      ...siteConfig.twitter,
      title: `${post?.metadata.title || "404"} | ${siteConfig.name}`,
    },
  };
}

export default function BlogDetailsPage({ params }: Props) {
  const { slug } = params;
  const { posts } = getBlogs();
  const postIndex = posts.findIndex((post: BlogPost) => post.metadata.slug === slug);
  const post = posts[postIndex];
  // Reverse list order, thus invert condition check
  const nextPost = postIndex - 1 >= 0 ? posts[postIndex - 1] : null;
  const prevPost = postIndex + 1 < posts.length ? posts[postIndex + 1] : null;

  if (!post) {
    notFound();
  }

  const { content, metadata } = post;

  return (
    <div className="flex flex-row w-full pt-0">
      <aside className="hidden md:block md:w-1/5 pl-6 max-h-[90vh] h-full overflow-auto sticky top-16 left-0 mt-6">
        <WeeklyList isSide posts={posts} sectionType="blogs" />
      </aside>
      <div className="w-full md:w-3/5 px-2 md:px-12">
        <article id={`article`}>
          <h1>{metadata.title}</h1>
          <MDXRemote
            source={content}
            components={MDXComponents}
            options={options as any}
          />
        </article>
        <Separator className="my-12 bg-gray-600" />
        <div className="flex justify-between">
          <div className="flex gap-2 flex-col lg:flex-row">
            <div>发布时间：{dayjs(metadata.date).format("YYYY-MM-DD")}</div>
            <Link
              href="https://creativecommons.org/licenses/by-nc-nd/3.0/deed.zh-hans"
              target="_blank"
              rel="noopener noreferrer nofollow"
              title="版权声明"
            >
              <span className="hidden lg:flex items-center">
                版权声明
                <IoIosLink />
              </span>
              <span className="flex lg:hidden">
                版权声明：CC BY-NC-ND 3.0 DEED
              </span>
            </Link>
          </div>
          <div className="flex gap-2 flex-col lg:flex-row">
            {prevPost ? (
              <Link
                href={prevPost.metadata.slug}
                className="link-underline"
                title="上一篇"
              >
                上一篇
              </Link>
            ) : null}
            {nextPost ? (
              <Link
                href={nextPost.metadata.slug}
                className="link-underline"
                title="下一篇"
              >
                下一篇
              </Link>
            ) : null}
            <Link href="/" className="link-underline" title="去首页">
              去首页
            </Link>
            <Link href="/rss.xml" className="link-underline" title="RSS">
              RSS
            </Link>
            <Link
              href="https://x.com/weijunext/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="link-underline"
              title="Twitter/X"
            >
              Twitter/X
            </Link>
          </div>
        </div>
        <div className="mt-16">
          <Comments />
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-start lg:w-1/5 pr-6">
        <TOC />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  try {
    const { posts } = getBlogs();
    
    if (!posts || !Array.isArray(posts)) {
      console.error('Invalid blog posts data:', posts);
      return [];
    }

    console.log('Generating static params for blog posts:', posts.length);
    
    return posts.map((post: BlogPost) => {
      if (!post.metadata?.slug) {
        console.warn('Blog post missing slug:', post);
        return null;
      }
      return {
        slug: post.metadata.slug,
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error in blog generateStaticParams:', error);
    return [];
  }
}