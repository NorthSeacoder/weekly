import {defineContentScript} from 'wxt/sandbox';
import {ScreenshotSelector} from './content/selector';
import {TextSelector} from './content/textSelector';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        console.log('AI Content script loaded');
        (window as any).ScreenshotSelector = ScreenshotSelector;
        (window as any).TextSelector = TextSelector;
    }
});
