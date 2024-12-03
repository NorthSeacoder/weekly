'use client';

import {CodeExample} from '@/lib/codeExamples/types';
import {CodeDemo} from './CodeDemo';

interface DemoLoaderProps {
    demoPath: string;
}

export function DemoLoader({demoPath}: DemoLoaderProps) {
    const demo = require(`@/demos/${demoPath}/index`).default as CodeExample;
    return <CodeDemo {...demo} />;
}
