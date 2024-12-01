import {Loader2, X} from 'lucide-react';
import React from 'react';
import {deleteImage, uploadImage} from '../lib/utils';
import {Button} from './ui/button';

interface Screenshot {
    dataUrl?: string; // 本地预览用
    url?: string; // 图床URL
    key?: string; // 图床图片ID
}

export function ElementSelector() {
    const [screenshot, setScreenshot] = React.useState<Screenshot | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string>('');

    // 初始化时从storage加载截图数据
    React.useEffect(() => {
        chrome.storage.local
            .get(['screenshot'])
            .then((result) => {
                if (result.screenshot?.dataUrl) {
                    setScreenshot(result.screenshot);
                }
            })
            .catch((err) => {
                console.error('Failed to load screenshot from storage:', err);
                setError('加载截图失败');
            });
    }, []);

    const handleScreenshot = async () => {
        try {
            setError('');
            // Hide popup
            window.close();

            // Start screenshot selector
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab.id) return;

            await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                func: () => {
                    if (!(window as any).ScreenshotSelector) {
                        console.error('ScreenshotSelector not found');
                        return;
                    }
                    const selector = new (window as any).ScreenshotSelector();
                    selector.start();
                }
            });
        } catch (err) {
            console.error('Error in handleScreenshot:', err);
            setError('截图失败，请重试');
        }
    };

    const handleGenerate = async () => {
        if (!screenshot?.dataUrl) return;

        try {
            setIsLoading(true);
            setError('');

            // 将 base64 转换为 blob
            const res = await fetch(screenshot.dataUrl);
            const blob = await res.blob();
            const file = new File([blob], 'screenshot.png', {type: 'image/png'});

            // 上传到图床
            const result = await uploadImage(file);
            console.log(result);
            setScreenshot((prev) => ({
                ...prev,
                url: result.url,
                key: result.key
            }));
        } catch (err) {
            console.error('Failed to upload screenshot:', err);
            setError(err instanceof Error ? err.message : '上传失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!screenshot) return;

        try {
            setIsLoading(true);
            setError('');

            // 如果已上传到图床，则需要删除
            if (screenshot.key) {
                await deleteImage(screenshot.key);
            }

            // 清除storage中的截图数据
            await chrome.storage.local.remove(['screenshot']);
            setScreenshot(null);
        } catch (err) {
            console.error('Failed to delete screenshot:', err);
            setError('删除失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='flex gap-4'>
                <Button
                    onClick={handleScreenshot}
                    variant='outline'
                    className='flex-1 bg-background/50 hover:bg-muted/80'
                    disabled={isLoading}>
                    {isLoading ? '处理中...' : '截图'}
                </Button>
            </div>

            {error && <div className='text-sm text-destructive text-center'>{error}</div>}

            <div className='relative min-h-[200px] p-6 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/30'>
                {screenshot ? (
                    <>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='absolute top-2 right-2 hover:bg-destructive hover:text-destructive-foreground'
                            onClick={handleDelete}
                            disabled={isLoading}>
                            <X className='h-4 w-4' />
                        </Button>
                        <img
                            src={screenshot.url || screenshot.dataUrl}
                            alt='Screenshot'
                            className='w-full h-auto rounded-lg'
                        />
                    </>
                ) : (
                    <div className='text-muted-foreground text-center'>截图将在这里预览</div>
                )}
            </div>

            <Button
                className='w-full bg-primary hover:bg-primary/90 shadow-lg'
                disabled={!screenshot || isLoading || !!screenshot.url}
                onClick={handleGenerate}>
                {isLoading ? (
                    <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        处理中...
                    </>
                ) : screenshot?.url ? (
                    '已生成'
                ) : (
                    '生成'
                )}
            </Button>
        </div>
    );
}
