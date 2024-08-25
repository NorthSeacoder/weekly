import {NextResponse} from 'next/server';
import {getTagGroup} from '@/lib/content';

export async function GET() {
    try {
        const result = await getTagGroup();
        // const tags = result.map(({tag}: {tag: string}) => tag);
        return NextResponse.json({code: 200, data: result});
    } catch (error) {
        return NextResponse.json({code: 500, error});
    }
}
