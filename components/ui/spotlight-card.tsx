'use client';

import { cn } from "@/lib/utils";
import React, { memo, useRef, useState } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

const SpotlightCard = memo(({ children, className }: SpotlightCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || !isHovered) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-800/40",
        "bg-gradient-to-b from-gray-900/50 to-gray-900/30",
        "transition-all duration-300",
        className
      )}
    >
      {/* 光效层 */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `radial-gradient(
            600px circle at ${position.x}px ${position.y}px,
            rgba(29, 78, 216, 0.15),
            transparent 80%
          )`
        }}
      />

      {/* 内容层 */}
      <div className="relative p-4 backdrop-blur-sm transition-colors duration-300">
        {children}
      </div>

      {/* 边框光效 */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `linear-gradient(
            var(--border-angle),
            rgba(29, 78, 216, 0.15),
            rgba(124, 58, 237, 0.15)
          )`,
          maskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          maskSize: '100% calc(100% - 1px), 100% 1px',
          maskPosition: '0 0, 0 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          WebkitMaskSize: '100% calc(100% - 1px), 100% 1px',
          WebkitMaskPosition: '0 0, 0 100%',
          WebkitMaskRepeat: 'no-repeat',
          ['--border-angle' as string]: isHovered ? '360deg' : '0deg',
          transition: 'all 4s linear'
        }}
      />
    </div>
  );
});

SpotlightCard.displayName = 'SpotlightCard';

export default SpotlightCard;
