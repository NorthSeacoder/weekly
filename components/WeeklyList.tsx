import { BlogPost } from "@/types/blog";
import { WeeklyPost } from "@/types/weekly";
import Link from "next/link";

interface WeeklyListProps {
  posts: (WeeklyPost | BlogPost)[];
  isSide?: boolean;
  sectionType?: "weekly" | "blogs";
}

// 类型守卫函数
function isWeeklyPost(post: WeeklyPost | BlogPost): post is WeeklyPost {
  return 'title' in post && !('metadata' in post);
}

// 从文章中提取所需信息的辅助函数
function getPostInfo(post: WeeklyPost | BlogPost) {
  if (isWeeklyPost(post)) {
    return {
      title: post.title,
      date: post.date,
      slug: post.slug,
      tags: post.tags
    };
  }
  return {
    title: post.metadata.title,
    date: post.metadata.date,
    slug: post.metadata.slug,
    tags: [] // 博客文章暂时不显示标签
  };
}

export default function WeeklyList({ posts, isSide, sectionType = "weekly" }: WeeklyListProps) {
  return (
    <div className="grid gap-4">
      {posts.map((post) => {
        const { title, date, slug, tags } = getPostInfo(post);

        return (
          <div key={slug} className="group">
            <Link
              href={`/${sectionType}/${slug}`}
              className={`block rounded-lg border bg-card p-6 text-card-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground ${
                isSide ? "p-4" : ""
              }`}
            >
              <h2
                className={`mb-2 font-medium tracking-tight ${
                  isSide ? "text-base" : "text-xl"
                }`}
              >
                {title}
              </h2>
              {!isSide && (
                <>
                  {tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:border-accent-foreground/20 group-hover:text-accent-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {new Date(date).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
