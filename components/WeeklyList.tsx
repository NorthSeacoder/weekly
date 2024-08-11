import { WeeklyPost } from "@/types/weekly";
import dayjs from "dayjs";
import { Link } from "next-view-transitions";
// import Link from "next/link";

export default async function WeeklyList({
  isSide,
  posts,
}: {
  isSide?: boolean;
  posts: WeeklyPost[];
}) {
  return (
    <ul className="flex flex-col gap-4">
      {posts.map((post) => (
        <li
          id={post.id}
          key={post.slug}
          className="flex flex-col sm:flex-row gap-4 items-start scroll-mt-16"
        >
          {isSide ? (
            <></>
          ) : (
            <span className="text-[#8585a8] min-w-28">
              {dayjs(post.date).format("YYYY-MM-DD")}
            </span>
          )}
          <Link
            href={`/weekly/${post.slug}`}
            className="link-default truncate transition-colors duration-500 ease-in-out"
          >
            {post.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
