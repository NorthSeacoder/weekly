import { query, transaction, execute, type RowDataPacket } from './database';

// 基础接口定义
export interface ContentType extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  parent_id?: number;
  sort_order: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Tag extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Content extends RowDataPacket {
  id: number;
  content_type_id: number;
  category_id?: number;
  title: string;
  slug: string;
  description?: string;
  content: string;
  content_format: 'markdown' | 'mdx' | 'html' | 'plain';
  status: 'draft' | 'published' | 'archived' | 'hidden';
  published_at?: Date;
  meta_title?: string;
  meta_description?: string;
  word_count: number;
  reading_time: number;
  view_count: number;
  source?: string;
  source_url?: string;
  screenshot_api: 'ScreenshotLayer' | 'HCTI' | 'manual';
  sort_order: number;
  featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ContentWithRelations extends Content {
  content_type_name?: string;
  category_name?: string;
}

export interface WeeklyIssue {
  id: number;
  issue_number: number;
  title: string;
  slug: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  published_at?: Date;
  total_items: number;
  total_word_count: number;
  reading_time: number;
  status: 'draft' | 'published' | 'archived';
  created_at: Date;
  updated_at: Date;
}

/**
 * 数据库服务类 - 内容类型管理
 */
export class ContentTypeService {
  /**
   * 获取所有内容类型
   */
  static async getAll(): Promise<ContentType[]> {
    return await query<ContentType[]>(`
      SELECT * FROM content_types 
      ORDER BY created_at ASC
    `);
  }

  /**
   * 根据slug获取内容类型
   */
  static async getBySlug(slug: string): Promise<ContentType | null> {
    const results = await query<ContentType[]>(`
      SELECT * FROM content_types 
      WHERE slug = ? LIMIT 1
    `, [slug]);
    return results[0] || null;
  }
}

/**
 * 数据库服务类 - 分类管理
 */
export class CategoryService {
  /**
   * 获取所有分类
   */
  static async getAll(): Promise<Category[]> {
    return await query<Category[]>(`
      SELECT * FROM categories 
      ORDER BY sort_order ASC, name ASC
    `);
  }

  /**
   * 根据slug获取分类
   */
  static async getBySlug(slug: string): Promise<Category | null> {
    const results = await query<Category[]>(`
      SELECT * FROM categories 
      WHERE slug = ? LIMIT 1
    `, [slug]);
    return results[0] || null;
  }

  /**
   * 获取顶级分类
   */
  static async getTopLevel(): Promise<Category[]> {
    return await query<Category[]>(`
      SELECT * FROM categories 
      WHERE parent_id IS NULL 
      ORDER BY sort_order ASC, name ASC
    `);
  }
}

/**
 * 数据库服务类 - 标签管理
 */
export class TagService {
  /**
   * 获取所有标签
   */
  static async getAll(): Promise<Tag[]> {
    return await query<Tag[]>(`
      SELECT * FROM tags 
      ORDER BY count DESC, name ASC
    `);
  }

  /**
   * 获取热门标签
   */
  static async getPopular(limit: number = 20): Promise<Tag[]> {
    return await query<Tag[]>(`
      SELECT * FROM tags 
      WHERE count > 0 
      ORDER BY count DESC 
      LIMIT ?
    `, [limit]);
  }
}

/**
 * 数据库服务类 - 内容管理
 */
export class ContentService {
  /**
   * 获取已发布的内容
   */
  static async getPublished(contentType?: string, limit?: number, offset?: number): Promise<Content[]> {
    let sql = `
      SELECT c.*, ct.name as content_type_name, cat.name as category_name
      FROM contents c
      LEFT JOIN content_types ct ON c.content_type_id = ct.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 'published'
    `;
    const params: any[] = [];

    if (contentType) {
      sql += ` AND ct.slug = ?`;
      params.push(contentType);
    }

    sql += ` ORDER BY c.published_at DESC, c.created_at DESC`;

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await query<Content[]>(sql, params);
  }

  /**
   * 根据ID获取内容
   */
  static async getById(id: number): Promise<ContentWithRelations | null> {
    const results = await query<ContentWithRelations[]>(`
      SELECT c.*, ct.name as content_type_name, cat.name as category_name
      FROM contents c
      LEFT JOIN content_types ct ON c.content_type_id = ct.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = ?
      LIMIT 1
    `, [id]);
    return results[0] || null;
  }

  /**
   * 根据slug获取内容
   */
  static async getBySlug(slug: string): Promise<Content | null> {
    const results = await query<Content>(`
      SELECT c.*, ct.name as content_type_name, cat.name as category_name
      FROM contents c
      LEFT JOIN content_types ct ON c.content_type_id = ct.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.slug = ? AND c.status = 'published'
      LIMIT 1
    `, [slug]);
    return results[0] || null;
  }

  /**
   * 获取精选内容
   */
  static async getFeatured(limit: number = 5): Promise<Content[]> {
    return await query<Content>(`
      SELECT c.*, ct.name as content_type_name, cat.name as category_name
      FROM contents c
      LEFT JOIN content_types ct ON c.content_type_id = ct.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 'published' AND c.featured = true
      ORDER BY c.published_at DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * 增加阅读数
   */
  static async incrementViewCount(id: number): Promise<void> {
    await query(`
      UPDATE contents 
      SET view_count = view_count + 1 
      WHERE id = ?
    `, [id]);
  }

  /**
   * 获取待审核的内容（管理员专用）
   */
  static async getPendingReview(limit?: number, offset?: number): Promise<ContentWithRelations[]> {
    let sql = `
      SELECT c.*, ct.name as content_type_name, cat.name as category_name
      FROM contents c
      LEFT JOIN content_types ct ON c.content_type_id = ct.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.status IN ('draft', 'hidden', 'archived')
      ORDER BY c.created_at DESC
    `;
    const params: any[] = [];

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await query<ContentWithRelations[]>(sql, params);
  }

  /**
   * 获取各状态内容统计（管理员专用）
   */
  static async getStatusStats(): Promise<{status: string, count: number}[]> {
    return await query<{status: string, count: number}[]>(`
      SELECT status, COUNT(*) as count
      FROM contents 
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'draft' THEN 1 
          WHEN 'published' THEN 2 
          WHEN 'hidden' THEN 3 
          WHEN 'archived' THEN 4 
        END
    `);
  }

  /**
   * 更新内容状态（管理员专用）
   */
  static async updateStatus(id: number, status: 'draft' | 'published' | 'archived' | 'hidden'): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      // 如果是发布状态，设置发布时间
      if (status === 'published') {
        updateData.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      values.push(id);
      
      const result = await execute(
        `UPDATE contents SET ${keys.map(key => `${key} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Failed to update content status:', error);
      return false;
    }
  }

  /**
   * 批量更新内容状态（管理员专用）
   */
  static async batchUpdateStatus(ids: number[], status: 'draft' | 'published' | 'archived' | 'hidden'): Promise<number> {
    if (ids.length === 0) return 0;
    
    try {
      const updateData: any = { status };
      
      // 如果是发布状态，设置发布时间
      if (status === 'published') {
        updateData.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      const keys = Object.keys(updateData);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const placeholders = ids.map(() => '?').join(',');
      
      const result = await execute(
        `UPDATE contents SET ${setClause}, updated_at = NOW() WHERE id IN (${placeholders})`,
        [...Object.values(updateData), ...ids]
      );
      
      return result.affectedRows;
    } catch (error) {
      console.error('Failed to batch update content status:', error);
      return 0;
    }
  }
}

/**
 * 数据库服务类 - 周刊管理
 */
export class WeeklyService {
  /**
   * 获取所有已发布的周刊
   */
  static async getPublished(limit?: number, offset?: number): Promise<WeeklyIssue[]> {
    let sql = `
      SELECT * FROM weekly_issues 
      WHERE status = 'published' 
      ORDER BY issue_number DESC
    `;
    const params: any[] = [];

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);
      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await query<WeeklyIssue>(sql, params);
  }

  /**
   * 根据期号获取周刊
   */
  static async getByIssueNumber(issueNumber: number): Promise<WeeklyIssue | null> {
    const results = await query<WeeklyIssue>(`
      SELECT * FROM weekly_issues 
      WHERE issue_number = ? AND status = 'published'
      LIMIT 1
    `, [issueNumber]);
    return results[0] || null;
  }

  /**
   * 根据slug获取周刊
   */
  static async getBySlug(slug: string): Promise<WeeklyIssue | null> {
    const results = await query<WeeklyIssue>(`
      SELECT * FROM weekly_issues 
      WHERE slug = ? AND status = 'published'
      LIMIT 1
    `, [slug]);
    return results[0] || null;
  }

  /**
   * 获取最新周刊
   */
  static async getLatest(): Promise<WeeklyIssue | null> {
    const results = await query<WeeklyIssue>(`
      SELECT * FROM weekly_issues 
      WHERE status = 'published' 
      ORDER BY issue_number DESC 
      LIMIT 1
    `);
    return results[0] || null;
  }
} 