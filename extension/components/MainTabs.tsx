import { ElementSelector } from './ElementSelector'
import { MarkdownEditor } from './MarkdownEditor'
import { Settings } from './Settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

export function MainTabs() {
  return (
    <div className="relative w-full max-w-4xl mx-auto p-4">
      <div className="bg-background/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 p-2">
        <Tabs defaultValue="elements" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 backdrop-blur-sm rounded-xl p-1 mb-2">
            <TabsTrigger value="elements" className="text-sm">获取元素</TabsTrigger>
            <TabsTrigger value="markdown" className="text-sm">MD 编辑</TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="elements" className="mt-1">
            <ElementSelector />
          </TabsContent>
          
          <TabsContent value="markdown" className="mt-1">
            <MarkdownEditor />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-1">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
     </div>
  )
}