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
    tags: [] 
  };
}

export default function WeeklyList({ posts, isSide, sectionType = "weekly" }: WeeklyListProps) {
  return (
    <div className={`${isSide ? 'space-y-2' : 'space-y-4'}`}>
      {posts.map((post) => {
        const { title, slug } = getPostInfo(post);
        return (
          <div 
            key={slug} 
            className={`
              ${isSide ? 'py-1' : 'py-2'} 
              hover:bg-gray-800/50 
              rounded-lg 
              transition-colors
            `}
          >
            <Link
              href={`/${sectionType}/${slug}`}
              className={`
                block 
                ${isSide ? 'px-2 text-sm' : 'px-4'} 
                text-gray-300 
                hover:text-gray-100
              `}
            >
              {title}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
