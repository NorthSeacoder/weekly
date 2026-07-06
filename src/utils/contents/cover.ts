import type { CoverTemplate, WeeklyCoverConfig } from '../../../types/weekly';

export interface IssueMeta {
    issueNumber: number;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
}

const VALID_TEMPLATES: CoverTemplate[] = [
    'default',
    'gradient-blue',
    'gradient-purple',
    'gradient-orange',
];

function formatDate(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

function buildSubtitle(issue: IssueMeta): string | undefined {
    const start = formatDate(issue.startDate);
    const end = formatDate(issue.endDate);
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
    return undefined;
}

function defaultConfig(issue: IssueMeta): WeeklyCoverConfig {
    const subtitle = buildSubtitle(issue);
    return {
        type: 'template',
        template: 'default',
        title: `第 ${issue.issueNumber} 期`,
        ...(subtitle ? { subtitle } : {}),
        issueNumber: issue.issueNumber,
    };
}

function isTemplate(value: unknown): value is CoverTemplate {
    return typeof value === 'string' && VALID_TEMPLATES.includes(value as CoverTemplate);
}

export function parseCover(
    raw: string | null | undefined,
    issue: IssueMeta,
): WeeklyCoverConfig {
    if (raw === null || raw === undefined || raw === '') {
        return defaultConfig(issue);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return defaultConfig(issue);
    }

    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as Record<string, unknown>).type !== 'template'
    ) {
        return defaultConfig(issue);
    }

    const obj = parsed as Record<string, unknown>;
    const template = isTemplate(obj.template) ? obj.template : 'default';
    const title = typeof obj.title === 'string' && obj.title
        ? obj.title
        : `第 ${issue.issueNumber} 期`;
    const subtitle = typeof obj.subtitle === 'string' && obj.subtitle
        ? obj.subtitle
        : buildSubtitle(issue);
    const issueNumber = typeof obj.issueNumber === 'number'
        ? obj.issueNumber
        : issue.issueNumber;

    return {
        type: 'template',
        template,
        title,
        ...(subtitle ? { subtitle } : {}),
        issueNumber,
    };
}
