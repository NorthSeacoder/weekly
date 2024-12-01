import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MousePosition } from '@/hooks/useCardInteraction'
import { cn } from '@/lib/utils'
import { useTransitionRouter } from 'next-view-transitions'
import React, { useEffect, useRef, useState } from 'react'

interface TechCardProps {
  id: string
  title: string
  tags: string[]
  mousePosition: MousePosition | null
}

const HIGHLIGHT_DISTANCE = 200

const TechCard: React.FC<TechCardProps> = ({ id, title, tags, mousePosition }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!mousePosition || !cardRef.current) {
      setHighlightStyle({})
      return
    }

    const rect = cardRef.current.getBoundingClientRect()
    const x = mousePosition.x - rect.left
    const y = mousePosition.y - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const distance = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    )

    if (distance <= HIGHLIGHT_DISTANCE) {
      const intensity = Math.max(0, 1 - (distance / HIGHLIGHT_DISTANCE))
      setHighlightStyle({
        '--x': `${x}px`,
        '--y': `${y}px`,
        '--intensity': intensity.toString(),
      } as React.CSSProperties)
    } else {
      setHighlightStyle({})
    }
  }, [mousePosition])

  const router = useTransitionRouter();
  const handleCardClick = (contentId: string, event: React.MouseEvent) => {
    // 阻止事件冒泡
    event.stopPropagation();
    // 使用正确的路由路径
    router.push(`/tag/${contentId}`);
};

  return (
    <Card
      ref={cardRef}
      className={cn(
        "group bg-[#31324180] border-[#3d3e4d]/20 hover:bg-[#3a3b4b]",
        "hover:shadow-[0_0_15px_rgba(62,63,77,0.2)]",
        "transition-all duration-300 ease-in-out",
        "hover:scale-102 hover:-translate-y-0.5",
        "relative rounded-xl overflow-hidden",
        "tech-card cursor-pointer"
      )}
      style={highlightStyle}
      onClick={(event) => handleCardClick(id, event)}
    >
      <CardHeader>
        <CardTitle className="text-xl text-gray-200 group-hover:text-cyan-300 transition-colors">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag, index) => (
            <Badge key={index} variant="tech">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
export default TechCard