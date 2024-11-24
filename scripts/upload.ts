import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
interface Links {
    markdown: string;
    url: string;
}

interface UploadResponse {
    status: boolean;
    message: string;
    data: {
        name: string;
        links: Links;
        pathname: string;
    };
}

interface TokenResponse {
    status: boolean;
    message: string;
    data: {
        token: string;
        expired_at: string;
    };
}

/**
 * 获取 Lsky Pro 的 token
 */
export async function getLskyToken(): Promise<string> {
    try {
        const username = process.env.LSKY_USERNAME;
        const password = process.env.LSKY_PASSWORD;

        if (!username || !password) {
            throw new Error('请在环境变量中设置 LSKY_USERNAME 和 LSKY_PASSWORD');
        }

        const response = await fetch('https://img.mengpeng.tech/api/v1/tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                email: username,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error(`获取token失败: ${response.statusText}`);
        }

        const result = (await response.json()) as TokenResponse;
        console.log(result);
        if (!result.status) {
            throw new Error(result.message || '获取token失败');
        }

        return result.data.token;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`获取token失败: ${error.message}`);
        }
        throw new Error('获取token时发生未知错误');
    }
}
// getLskyToken();
/**
 * 获取文件的 MIME 类型
 */
function getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 上传图片到 lsky.pro 图床
 * @param file - 文件对象或文件路径
 * @returns 返回上传后的图片URL
 */
export async function uploadImage(file: File | string): Promise<Links> {
    try {
        const token = process.env.LSKY_TOKEN;
        const formData = new FormData();

        // 如果传入的是文件路径，则需要转换为 File 对象
        if (typeof file === 'string') {
            const fileBuffer = await fs.promises.readFile(file);
            const fileName = path.basename(file);
            const mimeType = getMimeType(fileName);

            formData.append('file', new Blob([fileBuffer], {type: mimeType}), fileName);
        } else {
            formData.append('file', file);
        }

        const response = await fetch('https://img.mengpeng.tech/api/v1/upload', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`上传失败: ${response.statusText}`);
        }

        const result = (await response.json()) as UploadResponse;

        if (!result.status) {
            throw new Error(result.message || '上传失败');
        }
        console.log(result);
        return result.data.links;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`上传图片失败: ${error.message}`);
        }
        throw new Error('上传图片时发生未知错误');
    }
}
const contentDir = path.join(process.cwd(), 'public/sections');
uploadImage(path.join(contentDir, '2024-11', '001.png'));
