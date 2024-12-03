'use client';

import {cn} from '@/lib/utils';
import {useTheme} from 'next-themes';
import {Highlight, Language, themes} from 'prism-react-renderer';
import 'prismjs';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-scss';

interface CodeBlockProps {
    code: string;
    language: string;
    className?: string;
}

export function CodeBlock({code, language, className}: CodeBlockProps) {
    const {theme} = useTheme();

    // 映射语言到 Prism 支持的语言
    const languageMap: Record<string, Language> = {
        scss: 'scss',
        less: 'less',
        css: 'css',
        html: 'markup',
        javascript: 'javascript',
        js: 'javascript',
        typescript: 'typescript',
        ts: 'typescript'
    };

    return (
        <Highlight
            theme={theme === 'dark' ? themes.nightOwl : themes.nightOwlLight}
            code={code.trim()}
            language={languageMap[language] || 'text'}>
            {({className: _className, style, tokens, getLineProps, getTokenProps}) => (
                <pre className={cn('relative rounded-md', className)} style={style}>
                    <code className='relative block p-4 overflow-x-auto text-sm font-mono leading-6'>
                        {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({line})}>
                                {line.map((token, key) => (
                                    <span key={key} {...getTokenProps({token})} />
                                ))}
                            </div>
                        ))}
                    </code>
                </pre>
            )}
        </Highlight>
    );
}
