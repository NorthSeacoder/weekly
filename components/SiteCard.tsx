import Link from "next/link";
export default function SiteCard() {
  return (
    <div className="mb-8 rounded-lg border bg-card p-6 text-card-foreground shadow">
      <h1 className="mb-4 text-2xl font-bold">我不知道的周刊</h1>
      <p className="text-muted-foreground">
        记录每周在各个地方遇到的我不知道的知识。
      </p>
      <div className="mt-4 flex gap-2">
        <Link
          href="/rss.xml"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          RSS 订阅
        </Link>
      </div>
    </div>
  );
} 