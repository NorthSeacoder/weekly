import {PromptTemplate} from '@langchain/core/prompts';
import {ChatOpenAI} from '@langchain/openai';
import {StructuredOutputParser} from 'langchain/output_parsers';
import {z} from 'zod';

interface AIConfig {
    apiKey: string;
    baseUrl?: string;
    modelName: string;
    visionModel?: string;
    visionBaseUrl?: string;
    visionKey?: string;
}

interface AIProcessorData {
    url: string;
    date: string;
    title: string;
    tags: string[];
    category: string;
    summary: string;
    baseURL?: string;
    imageUrl: string;
}

const outputSchema = z.object({
    title: z.string().min(2).max(20),
    tags: z.array(z.string()).min(3).max(5),
    category: z.enum(['工具', '教程', '文章', 'repos', '网站', 'bug', '面试题']),
    summary: z.string().max(200)
});

type AnalysisOutput = z.infer<typeof outputSchema>;

export class AIProcessor {
    private apiKey: string;
    private model: ChatOpenAI;
    private outputParser: StructuredOutputParser<typeof outputSchema>;
    private visionModel?: ChatOpenAI;

    private static readonly DEFAULT_CONFIG = {
        baseUrl: 'https://api.smnet.asia/v1',
        modelName: 'deepseek-chat'
    };

    constructor(config: AIConfig) {
        this.apiKey = config.apiKey;

        const baseUrl = config.baseUrl || AIProcessor.DEFAULT_CONFIG.baseUrl;

        // 文本分析模型
        this.model = new ChatOpenAI({
            openAIApiKey: config.apiKey,
            modelName: config.modelName || AIProcessor.DEFAULT_CONFIG.modelName,
            temperature: 0,
            configuration: {
                basePath: baseUrl
            }
        });

        // 只在提供了视觉模型配置时初始化视觉功能
        if (config.visionModel) {
            this.visionModel = new ChatOpenAI({
                openAIApiKey: config.visionKey || config.apiKey,
                modelName: config.visionModel,
                temperature: 0,
                configuration: {
                    basePath: config.visionBaseUrl || baseUrl
                }
            });
        }

        this.outputParser = StructuredOutputParser.fromZodSchema(outputSchema);
    }

    async recognizeImage(imageBase64: string): Promise<string> {
        // 检查是否启用了视觉功能
        if (!this.visionModel) {
            throw new Error('视觉功能未启用，请先配置视觉模型');
        }

        try {
            const response = await this.visionModel.invoke([
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: '请详细描述这张图片的内容，包括图片中的文字和视觉元素。请用中文回答。'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64
                            }
                        }
                    ]
                }
            ]);

            if (typeof response.content === 'string') {
                return response.content;
            } else if (Array.isArray(response.content)) {
                return response.content.map((item) => (typeof item === 'string' ? item : item.text)).join('\n');
            }
            return '无法识别图片内容';
        } catch (error) {
            console.error('Image recognition failed:', error);
            throw new Error('图片识别失败');
        }
    }

    async analyze(content: string): Promise<AnalysisOutput> {
        const formatInstructions = this.outputParser.getFormatInstructions();

        const promptTemplate = new PromptTemplate({
            template: `分析以下内容，按照要求生成标准化的数据：
      
分析要求：
1. 标题(title)：提取最核心的产品/文章名称，去除副标题和描述性文字，限制在2-6个词
2. 标签(tags)：提取3-5个关键词作为标签，每个标签限制在2-4个汉字或英文单词
3. 分类(category)：必须是以下类别之一：工具、教程、文章、repos、网站、bug、面试题
4. 摘要(summary)：生成200字以内的中文摘要，突出核心功能和特点

内容：
{content}

{format_instructions}`,
            inputVariables: ['content'],
            partialVariables: {format_instructions: formatInstructions}
        });

        try {
            const chain = promptTemplate.pipe(this.model).pipe(this.outputParser);
            const result = await chain.invoke({content});
            return result as AnalysisOutput;
        } catch (error) {
            console.error('AI 分析失败:', error);
            throw new Error('内容分析失败');
        }
    }

    generateMDX(data: AIProcessorData) {
        const source = new URL(data.url).hostname;
        return `---
tags: [${data.tags.join(', ')}]
category: ${data.category}
source: ai-generated
date: ${data.date}
title: ${data.title}
---

### [${data.title}](${data.url})

![img](${data.imageUrl})

来源: [${source}](${data.url})

${data.summary}
`;
    }
}
