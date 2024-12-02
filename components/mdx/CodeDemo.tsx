'use client';

import {CodeExample} from '@/lib/codeExamples/types';
import {cn} from '@/lib/utils';
import {Check, Code, Copy} from 'lucide-react';
import {useState} from 'react';

interface CodeDemoProps extends CodeExample {
    className?: string;
}

export function CodeDemo({
    html = '',
    css = '',
    compiledCss = '',
    cssType = 'css',
    js = '',
    title,
    description,
    height = 200,
    dependencies = [],
    className
}: CodeDemoProps) {
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState(false);

    // 组合完整的代码
    const fullCode = `<!-- HTML -->
${html}

/* CSS */
${css}

// JavaScript
${js}`;

    // 处理复制功能
    const handleCopy = async () => {
        await navigator.clipboard.writeText(fullCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 创建预览内容
    const createPreview = () => {
        const styleTag = compiledCss ? `<style>${compiledCss}</style>` : '';
        const scriptTag = js ? `<script>${js}</script>` : '';
        const dependencyTags = dependencies
            .map((dep) => {
                if (dep.endsWith('.css')) {
                    return `<link rel="stylesheet" href="${dep}">`;
                }
                if (dep.endsWith('.js')) {
                    return `<script src="${dep}"></script>`;
                }
                return '';
            })
            .join('\n');

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    ${dependencyTags}
                    ${styleTag}
                </head>
                <body>
                    ${html}
                    ${scriptTag}
                </body>
            </html>
        `;
    };

    return (
        <div className={cn('my-6 rounded-lg border border-border/50', className)}>
            {/* 标题栏 */}
            <div className='flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30'>
                <span className='text-sm font-medium'>{title || 'Demo'}</span>
                <div className='flex items-center gap-2'>
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className='p-1.5 rounded-md hover:bg-muted/50 transition-colors'
                        title='查看代码'>
                        <Code className='h-4 w-4' />
                    </button>
                    <button
                        onClick={handleCopy}
                        className='p-1.5 rounded-md hover:bg-muted/50 transition-colors'
                        title='复制代码'>
                        {copied ? <Check className='h-4 w-4 text-green-500' /> : <Copy className='h-4 w-4' />}
                    </button>
                </div>
            </div>

            {/* 添加描述 */}
            {description && <div className='px-4 py-2 text-sm text-muted-foreground'>{description}</div>}

            {/* 预览区域 */}
            <div className='p-4 bg-background'>
                <iframe
                    srcDoc={createPreview()}
                    className='w-full border-0'
                    style={{height: `${height}px`}}
                    title={title || 'Demo Preview'}
                />
            </div>

            {/* 代码区域 */}
            {showCode && (
                <div className='border-t border-border/50'>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4'>
                        {html && (
                            <div>
                                <div className='text-xs font-medium mb-2'>HTML</div>
                                <pre className='text-sm bg-muted/30 p-3 rounded-md overflow-x-auto'>
                                    <code>{html}</code>
                                </pre>
                            </div>
                        )}
                        {css && (
                            <div>
                                <div className='text-xs font-medium mb-2'>{cssType.toUpperCase()}</div>
                                <pre className='text-sm bg-muted/30 p-3 rounded-md overflow-x-auto'>
                                    <code>{css}</code>
                                </pre>
                            </div>
                        )}
                        {js && (
                            <div>
                                <div className='text-xs font-medium mb-2'>JavaScript</div>
                                <pre className='text-sm bg-muted/30 p-3 rounded-md overflow-x-auto'>
                                    <code>{js}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
