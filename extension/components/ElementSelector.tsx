import React from 'react'
import { Button } from './ui/button'

export function ElementSelector() {
  const [selectedElement, setSelectedElement] = React.useState<string>('')

  const handleSelectElement = () => {
    setSelectedElement('<div>Selected Element Preview</div>')
  }

  const handleSelectPage = () => {
    setSelectedElement('<html>Full Page Preview</html>')
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Button 
          onClick={handleSelectElement} 
          variant="outline"
          className="flex-1 bg-background/50 hover:bg-muted/80"
        >
          选择元素
        </Button>
        <Button 
          onClick={handleSelectPage} 
          variant="outline"
          className="flex-1 bg-background/50 hover:bg-muted/80"
        >
          选择整页
        </Button>
      </div>
      
      <div className="min-h-[200px] p-6 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30">
        {selectedElement ? (
          <pre className="text-sm font-mono">{selectedElement}</pre>
        ) : (
          <div className="text-muted-foreground text-center">选择的元素将在这里预览</div>
        )}
      </div>

      <Button className="w-full bg-primary hover:bg-primary/90 shadow-lg">
        生成
      </Button>
    </div>
  )
}