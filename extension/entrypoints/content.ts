import {defineContentScript} from 'wxt/sandbox';

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_end',
    main(ctx) {
        console.log('Content script loaded', ctx);

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Received message:', request);

            if (request.action === 'extractContent') {
                // 获取页面标题
                const title = document.title;

                // 获取页面内容，优先获取文章主体
                const article = document.querySelector('article');
                const mainContent = document.querySelector('main');
                const content = (article || mainContent || document.body).innerText;

                const response = {
                    content: content.slice(0, 5000),
                    url: window.location.href,
                    title,
                    date: new Date().toISOString().split('T')[0]
                };

                console.log('Sending response:', response);
                sendResponse(response);
            }
            return true; // 保持消息通道开启
        });
    }
});
