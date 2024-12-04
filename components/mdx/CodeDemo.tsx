'use client';

import {CodeBlock} from '@/components/ui/code-block';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {CodeExample} from '@/lib/codeExamples/types';
import {cn} from '@/lib/utils';
import {Check, Code, Copy} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

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
    const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
    const [iframeContent, setIframeContent] = useState('');

    // 组合完整的代码
    const fullCode = `<!-- HTML -->
${html}

/* ${cssType.toUpperCase()} */
${css}

// JavaScript
${js}`;

    // 处理复制功能
    const handleCopy = async (code: string, type: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedMap((prev) => ({...prev, [type]: true}));
        setTimeout(() => {
            setCopiedMap((prev) => ({...prev, [type]: false}));
        }, 2000);
    };

    // 创建预览内容
    const createPreview = useCallback(() => {
        const styleTag = compiledCss ? `<style>${compiledCss}</style>` : '';
        const scriptTag = js ? `<script>${js}</script>` : '';
        const dependencyTags = dependencies
            .map((dep) => {
                if (dep.endsWith('.css')) return `<link rel="stylesheet" href="${dep}">`;
                if (dep.endsWith('.js')) return `<script src="${dep}"></script>`;
                return '';
            })
            .join('\n');

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    ${dependencyTags}
                    ${styleTag}
                    <style>
                        body {
                            margin: 0;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                    </style>
                </head>
                <body>
                    ${html}
                    ${scriptTag}
                </body>
            </html>
        `;
    }, [html, compiledCss, js, dependencies]);

    // 在客户端设置 iframe 内容
    useEffect(() => {
        setIframeContent(createPreview());
    }, [createPreview]);

    return (
        <div className={cn('my-6 rounded-lg border border-border/50', className)}>
            {/* 标题栏 */}
            <div className='flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30'>
                <span className='text-sm font-medium'>{title || 'Demo'}</span>
                <button
                    onClick={() => setShowCode(!showCode)}
                    className='p-1.5 rounded-md hover:bg-muted/50 transition-colors'
                    title='查看代码'>
                    <Code className='h-4 w-4' />
                </button>
            </div>

            {/* 添加描述 */}
            {description && <div className='px-4 py-2 text-sm text-muted-foreground'>{description}</div>}

            {/* 预览区域 */}
            <div className='p-4 bg-background'>
                <iframe
                    srcDoc={iframeContent}
                    className='w-full border-0'
                    style={{height: `${height}px`}}
                    title={title || 'Demo Preview'}
                />
            </div>

            {/* 代码区域 */}
            {showCode && (
                <div className='border-t border-border/50'>
                    <Tabs defaultValue='html' className='p-4'>
                        <TabsList className='w-full justify-start bg-muted/30 p-0 h-10'>
                            {html && <TabsTrigger value='html'>HTML</TabsTrigger>}
                            {css && <TabsTrigger value='css'>{cssType.toUpperCase()}</TabsTrigger>}
                            {js && <TabsTrigger value='js'>JavaScript</TabsTrigger>}
                        </TabsList>
                        {html && (
                            <TabsContent value='html' className='mt-2'>
                                <div className='relative'>
                                    <button
                                        onClick={() => handleCopy(html, 'html')}
                                        className='absolute right-2 top-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors z-10 bg-background/80 backdrop-blur-sm'
                                        title='复制代码'>
                                        {copiedMap.html ? (
                                            <Check className='h-4 w-4 text-green-500' />
                                        ) : (
                                            <Copy className='h-4 w-4' />
                                        )}
                                    </button>
                                    <CodeBlock code={html} language='html' className='bg-muted/30' />
                                </div>
                            </TabsContent>
                        )}
                        {css && (
                            <TabsContent value='css' className='mt-2'>
                                <div className='relative'>
                                    <button
                                        onClick={() => handleCopy(css, 'css')}
                                        className='absolute right-2 top-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors z-10 bg-background/80 backdrop-blur-sm'
                                        title='复制代码'>
                                        {copiedMap.css ? (
                                            <Check className='h-4 w-4 text-green-500' />
                                        ) : (
                                            <Copy className='h-4 w-4' />
                                        )}
                                    </button>
                                    <CodeBlock code={css} language={cssType} className='bg-muted/30' />
                                </div>
                            </TabsContent>
                        )}
                        {js && (
                            <TabsContent value='js' className='mt-2'>
                                <div className='relative'>
                                    <button
                                        onClick={() => handleCopy(js, 'js')}
                                        className='absolute right-2 top-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors z-10 bg-background/80 backdrop-blur-sm'
                                        title='复制代码'>
                                        {copiedMap.js ? (
                                            <Check className='h-4 w-4 text-green-500' />
                                        ) : (
                                            <Copy className='h-4 w-4' />
                                        )}
                                    </button>
                                    <CodeBlock code={js} language='javascript' className='bg-muted/30' />
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            )}
        </div>
    );
}
