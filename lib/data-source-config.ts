// 数据源类型
export type DataSource = 'filesystem' | 'database';

// 数据源配置
interface DataSourceConfig {
    source: DataSource;
    database?: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        charset?: string;
    };
}

// 获取当前数据源配置
export function getDataSourceConfig(): DataSourceConfig {
    // 优先从环境变量读取
    const dataSource = (process.env.DATA_SOURCE as DataSource) || 'filesystem';
    
    const config: DataSourceConfig = {
        source: dataSource
    };

    // 如果使用数据库，添加数据库配置
    if (dataSource === 'database') {
        config.database = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'weekly_blog',
            charset: 'utf8mb4'
        };
    }

    return config;
}

// 检查是否使用数据库
export function useDatabase(): boolean {
    return getDataSourceConfig().source === 'database';
}

// 检查是否使用文件系统
export function useFilesystem(): boolean {
    return getDataSourceConfig().source === 'filesystem';
}

// 开发模式下的数据源切换
export function switchDataSource(source: DataSource) {
    if (process.env.NODE_ENV === 'development') {
        process.env.DATA_SOURCE = source;
        console.log(`🔄 数据源已切换到: ${source}`);
    } else {
        console.warn('⚠️ 只能在开发环境下切换数据源');
    }
} 