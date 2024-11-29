import { Input } from './ui/input'

export function Settings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">API Base URL</label>
        <Input 
          placeholder="输入 API Base URL" 
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">OpenAI API Key</label>
        <Input 
          type="password" 
          placeholder="输入 OpenAI API Key" 
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">模型名称</label>
        <Input 
          placeholder="输入模型名称" 
          className="bg-background/50 backdrop-blur-sm border-border/50"
        />
      </div>
    </div>
  )
}