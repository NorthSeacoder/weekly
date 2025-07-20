import type { APIRoute } from 'astro';
import { initDatabase, query, execute, transaction } from '../../../../../lib/database';
import { verifyAdminAccess } from '../../../../utils/auth';

export const prerender = false;

interface CreateIssueRequest {
  title?: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // 简化权限验证，从环境变量读取密钥
    const adminKey = request.headers.get('x-admin-key');
    const expectedKey = import.meta.env.ADMIN_ACCESS_KEY || 'admin_2025_weekly';
    
    if (!adminKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: CreateIssueRequest = await request.json();
    
    if (!data.start_date || !data.end_date) {
      return new Response(JSON.stringify({
        success: false,
        error: '开始日期和结束日期是必需的'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    initDatabase();

    const result = await transaction(async (connection) => {
      // 获取下一个期号
      const [maxIssueResult] = await connection.execute(
        'SELECT COALESCE(MAX(issue_number), 0) + 1 as next_issue FROM weekly_issues'
      );
      const nextIssueNumber = (maxIssueResult as any).next_issue;

      // 创建期号数据
      const issueData = {
        issue_number: nextIssueNumber,
        title: data.title || `我不知道的周刊第 ${nextIssueNumber} 期`,
        slug: nextIssueNumber.toString(),
        description: data.description || `第 ${nextIssueNumber} 期周刊内容汇总`,
        start_date: data.start_date,
        end_date: data.end_date,
        total_items: 0,
        total_word_count: 0,
        reading_time: 0,
        status: 'draft',
        published_at: null
      };

      // 插入新期号
      const [insertResult] = await connection.execute(
        `INSERT INTO weekly_issues (${Object.keys(issueData).join(', ')}) 
         VALUES (${Object.keys(issueData).map(() => '?').join(', ')})`,
        Object.values(issueData)
      );

      const weeklyIssueId = (insertResult as any).insertId;

      return {
        id: weeklyIssueId,
        ...issueData
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('创建周刊期号错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 