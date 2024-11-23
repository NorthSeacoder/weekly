import Link from "next/link";
import { BsRss } from "react-icons/bs";
import { MdEmail } from "react-icons/md";

export default function SiteCard() {
  return (
    <div className="mb-8 rounded-lg border border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800 p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent">
            我不知道的周刊
          </h1>
          <p className="text-lg text-gray-300">
            记录每周在各个地方遇到的我不知道的知识。
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Link
            href="/rss.xml"
            className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-sm text-orange-400 transition-colors hover:bg-orange-500/20"
          >
            <BsRss className="h-4 w-4" />
            RSS 订阅
          </Link>
          <Link
            href="https://noteforms.com/forms/bvjqwl"
            className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/20"
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            <MdEmail className="h-4 w-4" />
            邮件订阅
          </Link>
        </div>

        <div className="text-sm text-gray-400">
          <p>
            每周更新，记录有趣的技术发现、工具推荐、开源项目等。
          </p>
        </div>
      </div>
    </div>
  );
} 