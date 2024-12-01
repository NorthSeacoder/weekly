import {defineContentScript} from 'wxt/sandbox';
import {ScreenshotSelector} from './content/selector';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        console.log('AI Content script loaded');
        (window as any).ElementSelector = ScreenshotSelector;
    }
});
