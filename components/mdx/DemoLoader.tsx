'use client';

import {CodeExample} from '@/lib/codeExamples/types';
import {CodeDemo} from './CodeDemo';

interface DemoLoaderProps {
    demoPath: string;
}

export function DemoLoader({demoPath}: DemoLoaderProps) {
    // 动态导入 demo 文件
    const demo = require(`@/demos/${demoPath}/index`).default as CodeExample;
    return <CodeDemo {...demo} />;
}
