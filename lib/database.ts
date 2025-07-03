// 加载环境变量
import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// 数据库配置接口
interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    charset?: string;
    timezone?: string;
    connectionLimit?: number;
}

// 数据库连接池
let pool: mysql.Pool | null = null;

// 获取数据库配置
function getDatabaseConfig(): DatabaseConfig {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'weekly_blog',
        charset: 'utf8mb4',
        timezone: '+08:00',
        connectionLimit: 10
    };
}

// 初始化数据库连接池
export function initDatabase(): mysql.Pool {
    if (!pool) {
        const config = getDatabaseConfig();
        pool = mysql.createPool({
            ...config,
            waitForConnections: true,
            queueLimit: 0
        });
    }
    return pool;
}

// 获取数据库连接
export function getDatabase(): mysql.Pool {
    if (!pool) {
        return initDatabase();
    }
    return pool;
}

// 执行查询
export async function query<T extends RowDataPacket[]>(
    sql: string, 
    params?: any[]
): Promise<T> {
    const db = getDatabase();
    const [rows] = await db.execute<T>(sql, params);
    return rows;
}

// 执行插入、更新、删除操作
export async function execute(
    sql: string, 
    params?: any[]
): Promise<ResultSetHeader> {
    const db = getDatabase();
    const [result] = await db.execute<ResultSetHeader>(sql, params);
    return result;
}

// 批量插入
export async function batchInsert(
    table: string,
    fields: string[],
    values: any[][]
): Promise<ResultSetHeader> {
    if (values.length === 0) {
        throw new Error('Values array cannot be empty');
    }
    
    const placeholders = '(' + fields.map(() => '?').join(', ') + ')';
    const allPlaceholders = values.map(() => placeholders).join(', ');
    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${allPlaceholders}`;
    const flatValues = values.flat();
    
    return execute(sql, flatValues);
}

// 关闭数据库连接
export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// 事务处理
export async function transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const db = getDatabase();
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 数据库工具类
export class DatabaseUtils {
    // 检查表是否存在
    static async tableExists(tableName: string): Promise<boolean> {
        const sql = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = ?
        `;
        const result = await query<RowDataPacket[]>(sql, [tableName]);
        return result[0].count > 0;
    }
    
    // 获取表的字段信息
    static async getTableColumns(tableName: string): Promise<any[]> {
        const sql = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `;
        return query(sql, [tableName]);
    }
    
    // 安全的插入或更新操作
    static async upsert(
        table: string,
        data: Record<string, any>,
        uniqueFields: string[]
    ): Promise<{ insertId?: number; affectedRows: number; isInsert: boolean }> {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        
        // 构建 ON DUPLICATE KEY UPDATE 部分
        const updateClause = fields
            .filter(field => !uniqueFields.includes(field))
            .map(field => `${field} = VALUES(${field})`)
            .join(', ');
        
        const sql = `
            INSERT INTO ${table} (${fields.join(', ')}) 
            VALUES (${placeholders})
            ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
        `;
        
        const result = await execute(sql, values);
        
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows,
            isInsert: result.affectedRows === 1
        };
    }
}

// 导出类型
export type { DatabaseConfig, RowDataPacket, ResultSetHeader }; 