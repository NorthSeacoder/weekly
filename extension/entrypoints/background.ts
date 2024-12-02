export default defineBackground(() => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'captureSelected') {
            handleScreenshot(message.area);
        }

        if (message.action === 'textSelected') {
            const {text, url, area} = message.data;
            // 先保存文本内容
            chrome.storage.local.set({
                selectedContent: {
                    text,
                    url,
                    type: 'text'
                }
            });
            // 同时处理截图
            handleScreenshot(area);
        }
    });

    // 提取截图处理逻辑为独立函数
    async function handleScreenshot(area: {
        x: number;
        y: number;
        width: number;
        height: number;
        devicePixelRatio: number;
    }) {
        try {
            // 等待足够长的时间确保UI完全隐藏
            await new Promise((resolve) => setTimeout(resolve, 100));

            const window = await chrome.windows.getCurrent();
            if (!window.id) {
                console.error('No active window found');
                return;
            }

            // 截取整个页面
            const fullDataUrl = await chrome.tabs.captureVisibleTab(window.id, {
                format: 'png'
            });

            // 将 dataUrl 转换为 blob
            const response = await fetch(fullDataUrl);
            const blob = await response.blob();

            // 创建 ImageBitmap
            const imageBitmap = await createImageBitmap(blob);

            // 创建 canvas 进行裁剪
            const canvas = new OffscreenCanvas(area.width, area.height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 考虑设备像素比进行缩放
            const scale = area.devicePixelRatio || 1;

            // 裁剪选定区域
            ctx.drawImage(
                imageBitmap,
                area.x * scale,
                area.y * scale,
                area.width * scale,
                area.height * scale,
                0,
                0,
                area.width,
                area.height
            );

            // 转换为 blob
            const croppedBlob = await canvas.convertToBlob({type: 'image/png'});

            // 转换为 dataUrl
            const reader = new FileReader();
            reader.onloadend = async () => {
                const croppedDataUrl = reader.result as string;
                console.log('Screenshot cropped successfully');

                // 保存裁剪后的图片到 storage
                await chrome.storage.local.set({
                    screenshot: {dataUrl: croppedDataUrl}
                });
            };
            reader.readAsDataURL(croppedBlob);

            // 清理资源
            imageBitmap.close();
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
        }
    }
});
