import {useConfig} from '../hooks/useConfig';
import {Input} from './ui/input';

export function Settings() {
    const {config, setConfig} = useConfig();
    return (
        <div className='space-y-6'>
            <div className='space-y-2'>
                <label className='text-sm font-medium'>lskyToken</label>
                <Input
                    value={config.lskyToken}
                    onChange={(e) => setConfig({lskyToken: e.target.value})}
                    placeholder='输入 lskyToken'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>
            <div className='space-y-2'>
                <label className='text-sm font-medium'>API Base URL</label>
                <Input
                    value={config.apiBaseUrl}
                    onChange={(e) => setConfig({apiBaseUrl: e.target.value})}
                    placeholder='输入 API Base URL'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>

            <div className='space-y-2'>
                <label className='text-sm font-medium'>OpenAI API Key</label>
                <Input
                    type='password'
                    value={config.openaiKey}
                    onChange={(e) => setConfig({openaiKey: e.target.value})}
                    placeholder='输入 OpenAI API Key'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>

            <div className='space-y-2'>
                <label className='text-sm font-medium'>模型名称</label>
                <Input
                    value={config.modelName}
                    onChange={(e) => setConfig({modelName: e.target.value})}
                    placeholder='输入模型名称'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>

            <div className='space-y-2'>
                <label className='text-sm font-medium'>视觉模型名称</label>
                <Input
                    value={config.visionModel}
                    onChange={(e) => setConfig({visionModel: e.target.value})}
                    placeholder='输入视觉模型名称'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>

            <div className='space-y-2'>
                <label className='text-sm font-medium'>视觉 API Base URL (可选)</label>
                <Input
                    value={config.visionBaseUrl || ''}
                    onChange={(e) => setConfig({visionBaseUrl: e.target.value})}
                    placeholder='输入视觉 API Base URL，留空则使用主 URL'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>

            <div className='space-y-2'>
                <label className='text-sm font-medium'>视觉 API Key (可选)</label>
                <Input
                    type='password'
                    value={config.visionKey || ''}
                    onChange={(e) => setConfig({visionKey: e.target.value})}
                    placeholder='输入视觉 API Key，留空则使用主 Key'
                    className='bg-background/50 backdrop-blur-sm border-border/50'
                />
            </div>
        </div>
    );
}
