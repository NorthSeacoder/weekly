import {CSSProperties, useCallback, useState} from 'react';

export interface MousePosition {
    x: number;
    y: number;
}

interface CardStyle extends CSSProperties {
    '--x'?: string;
    '--y'?: string;
    '--highlight-intensity'?: number;
}

export const useCardInteraction = () => {
    const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
    const [cardStyle, setCardStyle] = useState<CardStyle>({});

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePosition({x: e.clientX, y: e.clientY});
        setCardStyle({
            '--x': `${x}px`,
            '--y': `${y}px`
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setMousePosition(null);
        setCardStyle({});
    }, []);

    return {
        mousePosition,
        cardStyle,
        handleMouseMove,
        handleMouseLeave
    };
};
