import { getTagData } from '@/lib/tag';
import TagClient from './tag-client';

export default async function TagPage() {
    // 在服务端获取标签数据
    const tagData = getTagData();
    
    return <TagClient tagData={tagData} />;
}
