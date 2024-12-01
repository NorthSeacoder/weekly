import colors from 'ansi-colors';
import cliProgress from 'cli-progress';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
interface Links {
    markdown: string;
    url: string;
    key: string;
}

interface UploadResponse {
    status: boolean;
    message: string;
    data: {
        name: string;
        links: Links;
        pathname: string;
        key: string;
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

interface ImageInfo {
    key: string;
    name: string;
    pathname: string;
}

interface ImagesResponse {
    status: boolean;
    message: string;
    data: {
        data: ImageInfo[];
        current_page: number;
        total: number;
        per_page: number;
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
        const {links, key} = result.data;
        return {...links, key};
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`上传图片失败: ${error.message}`);
        }
        throw new Error('上传图片时发生未知错误');
    }
}
// const contentDir = path.join(process.cwd(), 'public/sections');
// uploadImage(path.join(contentDir, '2024-11', '001.png'));

/**
 * 获取图床中的所有图片
 */
async function getAllImages(): Promise<ImageInfo[]> {
    try {
        const token = process.env.LSKY_TOKEN;
        let page = 1;
        const images: ImageInfo[] = [];

        while (true) {
            const response = await fetch(`https://img.mengpeng.tech/api/v1/images?page=${page}&per_page=100`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`获取图片列表失败: ${response.statusText}`);
            }

            const result = (await response.json()) as ImagesResponse;

            if (!result.status) {
                throw new Error(result.message || '获取图片列表失败');
            }
            images.push(...result.data.data);

            // 如果已经获取所有页面,退出循环
            if (page * result.data.per_page >= result.data.total) {
                break;
            }

            page++;
        }

        return images;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`获取图片列表失败: ${error.message}`);
        }
        throw new Error('获取图片列表时发生未知错误');
    }
}

/**
 * 删除单张图片
 */
export async function deleteImage(key: string): Promise<boolean> {
    try {
        const token = process.env.LSKY_TOKEN;
        const response = await fetch(`https://img.mengpeng.tech/api/v1/images/${key}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`删除图片失败: ${response.statusText}`);
        }

        const result = await response.json();
        return result.status === true;
    } catch (error) {
        console.error(`删除图片 ${key} 失败:`, error);
        return false;
    }
}

/**
 * 清空图床中的所有图片
 */
export async function clearAllImages(): Promise<void> {
    try {
        console.log('开始获取图片列表...');
        const images = await getAllImages();
        console.log(`共找到 ${images.length} 张图片`);

        if (images.length === 0) {
            console.log('图床为空,无需清理');
            return;
        }

        console.log('开始删除图片...');
        const bar = new cliProgress.SingleBar({
            format: 'Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Images',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591'
        });

        bar.start(images.length, 0);

        let success = 0;
        let failed = 0;

        // 并发删除,但限制并发数
        const MAX_CONCURRENT = 10;
        for (let i = 0; i < images.length; i += MAX_CONCURRENT) {
            const batch = images.slice(i, i + MAX_CONCURRENT);
            const results = await Promise.all(
                batch.map(async (img) => {
                    const result = await deleteImage(img.key);
                    bar.increment(1);
                    return result;
                })
            );

            success += results.filter(Boolean).length;
            failed += results.filter((r) => !r).length;
        }

        bar.stop();

        console.log('\n清理完成!');
        console.log(`成功: ${success}`);
        console.log(`失败: ${failed}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error('清空图床失败:', error.message);
        } else {
            console.error('清空图床时发生未知错误');
        }
        throw error;
    }
}
getAllImages();
// 使用示例:
// clearAllImages().catch(console.error);
