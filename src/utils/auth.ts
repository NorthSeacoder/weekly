/**
 * 简单的管理员权限验证工具
 * 支持多种验证方式：密钥、IP白名单
 */

// 获取管理员验证配置
export function getAdminConfig() {
    return {
        // 管理员访问密钥
        adminKey: process.env.ADMIN_ACCESS_KEY || 'admin_2025_weekly',
        // IP白名单（用逗号分隔）
        allowedIPs: process.env.ADMIN_ALLOWED_IPS?.split(',') || [],
        // 是否启用IP检查
        enableIPCheck: process.env.ADMIN_ENABLE_IP_CHECK === 'true',
        // 是否启用密钥检查
        enableKeyCheck: process.env.ADMIN_ENABLE_KEY_CHECK !== 'false' // 默认启用
    };
}

/**
 * 验证管理员访问权限
 * @param request - Astro请求对象
 * @returns boolean - 是否有权限访问
 */
export function verifyAdminAccess(request: Request): boolean {
    const config = getAdminConfig();
    const url = new URL(request.url);
    
    // 1. 检查密钥验证
    if (config.enableKeyCheck) {
        // 尝试不同的方式获取Cookie
        const cookieHeaderLower = request.headers.get('cookie');
        const cookieHeaderUpper = request.headers.get('Cookie');
        const cookieString = cookieHeaderLower || cookieHeaderUpper || '';
        
        // 获取各种认证方式
        const urlKey = url.searchParams.get('key');
        const headerKey = request.headers.get('x-admin-key');
        const cookieKey = getCookieValue(cookieString, 'admin_key');
        
        const adminKey = urlKey || headerKey || cookieKey;
        

        
        if (!adminKey || adminKey !== config.adminKey) {
            console.log('[Auth] Access denied: Invalid or missing admin key');
            return false;
        }
    }
    
    // 2. 检查IP白名单（如果启用）
    if (config.enableIPCheck && config.allowedIPs.length > 0) {
        const clientIP = getClientIP(request);
        if (!config.allowedIPs.includes(clientIP)) {
            console.log('[Auth] Access denied: IP not in whitelist:', clientIP);
            return false;
        }
    }
    
    return true;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(request: Request): string {
    // 尝试从各种标头获取真实IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }
    
    // 从URL获取（开发环境）
    const url = new URL(request.url);
    return url.hostname || '127.0.0.1';
}

/**
 * 从Cookie字符串中获取特定值
 */
function getCookieValue(cookieString: string, name: string): string | null {
    if (!cookieString) {
        return null;
    }
    
    const cookies = cookieString.split(';').map(c => c.trim());
    
    // 方法1: 标准匹配
    const targetPrefix = `${name}=`;
    const cookie = cookies.find(c => c.startsWith(targetPrefix));
    
    if (cookie) {
        return cookie.substring(name.length + 1);
    }
    
    // 方法2: 更宽松的匹配（忽略大小写和空格）
    for (const c of cookies) {
        const trimmed = c.trim();
        if (trimmed.toLowerCase().startsWith(`${name.toLowerCase()}=`)) {
            return trimmed.substring(trimmed.indexOf('=') + 1);
        }
    }
    
    // 方法3: 正则表达式匹配
    const regex = new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*([^;]+)`, 'i');
    const match = cookieString.match(regex);
    if (match) {
        return match[1].trim();
    }
    
    return null;
}

/**
 * 生成管理员登录URL
 */
export function generateAdminLoginURL(baseURL: string, returnPath?: string): string {
    const config = getAdminConfig();
    const url = new URL('/admin/login', baseURL);
    
    if (returnPath) {
        url.searchParams.set('return', returnPath);
    }
    
    return url.toString();
}

/**
 * 设置管理员认证Cookie
 */
export function setAdminCookie(): string {
    const config = getAdminConfig();
    const maxAge = 60 * 60 * 24; // 24小时
    // 移除 HttpOnly 属性，使前端 JavaScript 可以访问
    // 使用 SameSite=Lax 与登录页面保持一致
    return `admin_key=${config.adminKey}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

/**
 * 清除管理员认证Cookie
 */
export function clearAdminCookie(): string {
    return 'admin_key=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict';
} 