import {PromptTemplate} from '@langchain/core/prompts';
import {ChatOpenAI} from '@langchain/openai';
import {StructuredOutputParser} from 'langchain/output_parsers';
import {z} from 'zod';

interface AIProcessorData {
    url: string;
    date: string;
    title: string;
    tags: string[];
    category: string;
    summary: string;
    baseURL: string;
}

export class AIProcessor {
    private apiKey: string;
    private model: ChatOpenAI;
    private outputParser: StructuredOutputParser;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.model = new ChatOpenAI({
            openAIApiKey: apiKey,
            modelName: 'deepseek-chat',
            temperature: 0,
            configuration: {
                basePath: 'https://api.smnet.asia/v1'
            }
        });

        this.outputParser = StructuredOutputParser.fromZodSchema(
            z.object({
                title: z.string().min(2).max(20),
                tags: z.array(z.string()).min(3).max(5),
                category: z.enum(['工具', '教程', '文章', 'repos', '网站', 'bug', '面试题']),
                summary: z.string().max(200)
            })
        );
    }

    async analyze(content: string): Promise<{
        title: string;
        tags: string[];
        category: string;
        summary: string;
    }> {
        const formatInstructions = this.outputParser.getFormatInstructions();

        const promptTemplate = new PromptTemplate({
            template: `分析以下网页内容，按照要求生成标准化的数据：
      
分析要求：
1. 标题(title)：提取最核心的产品/文章名称，去除副标题和描述性文字，限制在2-6个词
2. 标签(tags)：提取3-5个关键词作为标签，每个标签限制在2-4个汉字或英文单词
3. 分类(category)：必须是以下类别之一：工具、教程、文章、repos、网站、bug、面试题
4. 摘要(summary)：生成200字以内的中文摘要，突出核心功能和特点

网页内容：
{content}

{format_instructions}`,
            inputVariables: ['content'],
            partialVariables: {format_instructions: formatInstructions}
        });

        try {
            const chain = promptTemplate.pipe(this.model).pipe(this.outputParser);
            return await chain.invoke({content});
        } catch (error) {
            console.error('AI 分析失败:', error);
            return {
                title: '未知标题',
                tags: ['工具', 'AI'],
                category: '工具',
                summary: content.slice(0, 200)
            };
        }
    }

    generateMDX(data: AIProcessorData) {
        const source = new URL(data.url).hostname;
        return `---
tags: [${data.tags.join(', ')}]
category: ${data.category}
source: ${source}
date: ${data.date}
title: ${data.title}
---

### [${data.title}](${data.url})

来源: [${source}](${data.url})

${data.summary}
`;
    }
}
