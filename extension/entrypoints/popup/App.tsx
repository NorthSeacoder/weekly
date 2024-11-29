/// <reference types="chrome"/>

import { MainTabs } from '@/components/MainTabs'

export default function App() {
  return (
    <div className="min-w-[680px] rounded-2xl border-border/40  bg-gradient-to-br from-background via-background/98 to-background/95">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <MainTabs />
    </div>
  )
}