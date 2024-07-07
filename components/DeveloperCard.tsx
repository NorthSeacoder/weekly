"use client";

import FollowButton from "@/components/FollowButton";
import { Avatar, Card, CardBody, CardHeader, Chip } from "@nextui-org/react";

export default function DeveloperCard() {
  return (
    <div className="flex w-full items-start justify-center mt-12">
      <Card className="mt-10 w-[400px]">
        <CardHeader className="relative flex h-[100px] flex-col justify-end overflow-visible bg-gradient-to-br from-indigo-300 via-Cyan-300 to-blue-400">
          <Avatar className="h-20 w-20 translate-y-12" src="/avatar.jpg" />
        </CardHeader>
        <CardBody>
          <div className="pb-4 pt-6">
            <p className="text-large font-medium">northseacoder</p>
            <p className="max-w-[90%] text-small text-default-400">
              @northseacoder
            </p>
            <div className="flex gap-2 pb-1 pt-2">
              <Chip variant="flat">JavaScript</Chip>
              <Chip variant="flat">React</Chip>
              <Chip variant="flat">Umi</Chip>
              <Chip variant="flat">Next.js</Chip>
            </div>
            <p className="py-2 text-small text-foreground">
              高级复制粘贴工程师 | 收集控 | 代码搬运工
            </p>
            <div className="w-full text-center mt-4 flex justify-evenly">
              {/* <FollowButton
                name="Twitter/X"
                href="https://x.com/noethseacoder/"
              ></FollowButton> */}
              <FollowButton
                name="Github"
                href="https://github.com/northseacoder"
              ></FollowButton>
              <FollowButton
                name="掘金"
                href="https://juejin.cn/user/2101921962025421"
              ></FollowButton>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
