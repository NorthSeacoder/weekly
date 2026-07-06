#!/usr/bin/env tsx

import { config } from 'dotenv';
config();

import { initDatabase, query, transaction } from '../lib/database';
import type { RowDataPacket } from 'mysql2/promise';

interface IssueRow extends RowDataPacket {
    id: number;
    issue_number: number;
    title: string;
    start_date: string | null;
    end_date: string | null;
    cover: string | null;
}

const TEMPLATES = ['default', 'gradient-blue', 'gradient-purple', 'gradient-orange'] as const;

function pickTemplate(issueNumber: number): (typeof TEMPLATES)[number] {
    return TEMPLATES[issueNumber % TEMPLATES.length];
}

function formatDate(value: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
}

function buildCoverJson(row: IssueRow): string {
    const template = pickTemplate(row.issue_number);
    const start = formatDate(row.start_date);
    const end = formatDate(row.end_date);
    let subtitle: string | undefined;
    if (start && end) subtitle = `${start} - ${end}`;
    else if (start) subtitle = start;
    else if (end) subtitle = end;

    const obj: Record<string, unknown> = {
        type: 'template',
        template,
        title: `第 ${row.issue_number} 期`,
        issueNumber: row.issue_number,
    };
    if (subtitle) obj.subtitle = subtitle;
    return JSON.stringify(obj);
}

function isAlreadyMigrated(cover: string | null): boolean {
    if (!cover) return false;
    try {
        const parsed = JSON.parse(cover);
        return parsed?.type === 'template';
    } catch {
        return false;
    }
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    initDatabase();

    console.log(`\n📦 Cover 模板迁移${isDryRun ? ' (DRY RUN)' : ''}\n`);

    const rows = await query<IssueRow[]>(
        'SELECT id, issue_number, title, start_date, end_date, cover FROM weekly_issues ORDER BY issue_number',
    );

    let skipped = 0;
    let toUpdate: { id: number; cover: string; title: string }[] = [];

    for (const row of rows) {
        if (isAlreadyMigrated(row.cover)) {
            skipped++;
            continue;
        }
        toUpdate.push({ id: row.id, cover: buildCoverJson(row), title: row.title });
    }

    console.log(`  总期数: ${rows.length}`);
    console.log(`  已有模板 (跳过): ${skipped}`);
    console.log(`  待迁移: ${toUpdate.length}\n`);

    if (toUpdate.length === 0) {
        console.log('✅ 无需迁移，所有记录已有 cover 模板。');
        process.exit(0);
    }

    if (isDryRun) {
        console.log('预览前 5 条:');
        for (const item of toUpdate.slice(0, 5)) {
            console.log(`  [${item.id}] ${item.title}`);
            console.log(`       → ${item.cover}`);
        }
        console.log('\n🔍 Dry run 完成，未修改数据库。');
        process.exit(0);
    }

    await transaction(async (conn) => {
        for (const item of toUpdate) {
            await conn.query('UPDATE weekly_issues SET cover = ? WHERE id = ?', [item.cover, item.id]);
        }
    });

    console.log(`✅ 迁移完成，已更新 ${toUpdate.length} 条记录。`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
});
