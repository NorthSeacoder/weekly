import type {StructuredContent} from '@/types/weekly';

/**
 * 尝试将底层内容解析为结构化数据。
 *  - 对 JSON 字符串做解析
 *  - 其他类型原样返回，保持向后兼容
 */
export function parseStructuredContent(raw: unknown): StructuredContent {
    if (typeof raw !== 'string') {
        return raw as StructuredContent;
    }

    const trimmed = raw.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed) as StructuredContent;
        } catch (error) {
            console.warn('Failed to parse structured content, fallback to raw string', error);
        }
    }

    return raw as StructuredContent;
}

/**
 * 将结构化内容压平为可用于摘要/阅读时长的纯文本。
 */
export function structuredContentToText(content: StructuredContent): string {
    if (content === null || content === undefined) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'number' || typeof content === 'boolean') return String(content);
    if (Array.isArray(content)) {
        return content.map((item) => structuredContentToText(item)).filter(Boolean).join('\n');
    }
    if (typeof content === 'object') {
        return Object.values(content as Record<string, StructuredContent>)
            .map((value) => structuredContentToText(value))
            .filter(Boolean)
            .join('\n');
    }
    return '';
}
