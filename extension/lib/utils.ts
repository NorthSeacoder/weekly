import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

async function getConfig(): Promise<{lskyToken: string}> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lskyToken'], (result) => {
            resolve({
                lskyToken: result.lskyToken || ''
            });
        });
    });
}

/**
 * 上传图片到 lsky.pro 图床
 * @param file - 文件对象
 * @returns 返回上传后的图片URL和key
 */
export async function uploadImage(file: File): Promise<Links> {
    try {
        const {lskyToken} = await getConfig();
        if (!lskyToken) {
            throw new Error('请先在设置中配置 Lsky Token');
        }
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://img.mengpeng.tech/api/v1/upload', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${lskyToken}`,
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

        const {links, key} = result.data;
        return {...links, key};
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`上传图片失败: ${error.message}`);
        }
        throw new Error('上传图片时发生未知错误');
    }
}

/**
 * 删除单张图片
 */
export async function deleteImage(key: string): Promise<boolean> {
    try {
        const {lskyToken} = await getConfig();
        if (!lskyToken) {
            throw new Error('请先在设置中配置 Lsky Token');
        }

        const response = await fetch(`https://img.mengpeng.tech/api/v1/images/${key}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${lskyToken}`,
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
