/// <reference types="chrome"/>

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStorage } from '../../hooks/useStorage';
import { cn } from '../../lib/utils';
import { AIProcessor } from '../utils/ai';

function App() {
  const [showKey, setShowKey] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const { apiKey, setApiKey, baseURL, setBaseURL, modelName, setModelName } = useStorage();

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // await chrome.scripting.executeScript({
      //   target: { tabId: tab.id! },
      //   files: ['entrypoints/content.ts']
      // });
      console.log('sendbefore',tab);
      const response = await chrome.tabs.sendMessage(tab.id!, { action: 'extractContent' });
      console.log('sendafter',response);
      const aiProcessor = new AIProcessor(apiKey);
      const analysis = await aiProcessor.analyze(response.content);
      
      const mdxContent = aiProcessor.generateMDX({
        ...response,
        ...analysis
      });

      setResult(mdxContent);
    } catch (error: any) {
      setResult(`错误: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="w-[450px] p-4 bg-background">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            AI 页面分析器
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 OpenAI API Key"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <Input
              type="url"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="输入 API Base URL"
            />

            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="输入模型名称"
            />
          </div>

          <Button 
            className="w-full"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                分析中...
              </>
            ) : '分析当前页面'}
          </Button>

          {result && (
            <div className="space-y-2">
              <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto">
                <code>{result}</code>
              </pre>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopy}
              >
                <Copy className={cn(
                  "mr-2 h-4 w-4",
                  copying && "text-green-500"
                )} />
                {copying ? '已复制!' : '复制内容'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
