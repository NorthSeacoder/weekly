import {promises as fs} from 'fs';
import path from 'path';
import type {CardInfo} from '@/types/content';

const getDataByname = async (name: string) => {
    const jsonDirectory = path.join(process.cwd(), 'public/data');
    const filePath = path.join(jsonDirectory, `${name}.json`);
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents);
};

export const getContents = async () => {
    const data = await getDataByname('content');
    return data;
};

export const getContent = async (contentId: string) => {
    const data = await getDataByname('content');
    return data.find(({metadata}: CardInfo) => metadata.contentId === contentId);
};

export const getTagGroup = async () => {
    const data = await getDataByname('tagGroup');
    return data;
};
