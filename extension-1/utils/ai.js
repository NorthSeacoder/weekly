import {ChatOpenAI} from "langchain/chat_models";
import {JsonOutputParser} from "langchain/output_parsers";
import {PromptTemplate} from "langchain/prompts";

class AIProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "deepseek-chat",
      temperature: 0,
      baseURL: "https://api.smnet.asia/v1",
    });
    this.outputParser = new JsonOutputParser();
  }

  async analyze(content) {
    const promptTemplate = new PromptTemplate({
      template: `分析以下网页内容，按照要求生成标准化的数据：
      
分析要求：
1. 标题(title)：提取最核心的产品/文章名称，去除副标题和描述性文字，限制在2-6个词
2. 标签(tags)：提取3-5个关键词作为标签，每个标签限制在2-4个汉字或英文单词
3. 分类(category)：必须是以下类别之一：工具、教程、文章、repos、网站、bug、面试题
4. 摘要(summary)：生成200字以内的中文摘要，突出核心功能和特点

网页内容：
{content}

请严格按照以下JSON格式输出：
{
  "title": "简化后的标题",
  "tags": ["标签1", "标签2", "标签3"],
  "category": "分类名称",
  "summary": "内容摘要"
}`,
      inputVariables: ["content"],
    });

    try {
      const chain = promptTemplate.pipe(this.model).pipe(this.outputParser);
      const result = await chain.invoke({ content });
      
      return {
        title: result.title,
        tags: result.tags,
        category: result.category,
        summary: result.summary,
      };
    } catch (error) {
      console.error('AI 分析失败:', error);
      return {
        title: '未知标题',
        tags: ['工具', 'AI'],
        category: '工具',
        summary: content.slice(0, 200),
      };
    }
  }

  generateMDX(data) {
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

export default AIProcessor;
