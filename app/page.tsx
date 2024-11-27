import DeveloperCard from "@/components/DeveloperCard";
import SiteCard from "@/components/SiteCard";
import TimeLine from "@/components/TimeLine";
import WeeklyList from "@/components/WeeklyList";
import { getWeeklyPosts } from "@/lib/weekly";

export default function Home() {
  const posts = getWeeklyPosts();
  // 从 posts 中提取月份数据
  const postsByMonth = Array.from(
    new Set(posts.map(post => post.id))
  );
  
  return (
    <div className="flex flex-row w-full pt-6">
      <div className="hidden md:block md:w-1/5 pl-6"></div>
      <div className="w-full md:w-3/5 px-6">
        <SiteCard />
        <WeeklyList posts={posts} />
        <DeveloperCard />
      </div>
      <div className="hidden md:flex justify-end md:w-1/5 pr-6 text-right">
        <TimeLine postsByMonth={postsByMonth}></TimeLine>
      </div>
    </div>
  );
}
