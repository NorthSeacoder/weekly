export class ScreenshotSelector {
    private overlay: HTMLDivElement;
    private selection: HTMLDivElement;
    private isSelecting: boolean = false;
    private startX: number = 0;
    private startY: number = 0;

    constructor() {
        // 创建全屏遮罩
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 10000;
            cursor: crosshair;
        `;

        // 创建选择框
        this.selection = document.createElement('div');
        this.selection.style.cssText = `
            position: fixed;
            border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            display: none;
            z-index: 10001;
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.selection);

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.overlay.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('keydown', this.handleKeyDown);
    }

    private handleMouseDown = (e: MouseEvent) => {
        this.isSelecting = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.selection.style.display = 'block';
        this.updateSelection(e);
    };

    private handleMouseMove = (e: MouseEvent) => {
        if (!this.isSelecting) return;
        this.updateSelection(e);
    };

    private handleMouseUp = async (e: MouseEvent) => {
        if (!this.isSelecting) return;
        this.isSelecting = false;

        // 获取选择区域
        const rect = this.selection.getBoundingClientRect();
        const area = {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            devicePixelRatio: window.devicePixelRatio
        };

        // 临时隐藏选择器UI
        this.overlay.style.display = 'none';
        this.selection.style.display = 'none';

        // 等待一帧以确保UI已隐藏
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // 发送消息到 background 进行截图
        chrome.runtime.sendMessage({
            action: 'captureSelected',
            area: area
        });

        this.cleanup();
    };

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            this.cleanup();
        }
    };

    private updateSelection(e: MouseEvent) {
        const rect = {
            left: Math.min(e.clientX, this.startX),
            top: Math.min(e.clientY, this.startY),
            width: Math.abs(e.clientX - this.startX),
            height: Math.abs(e.clientY - this.startY)
        };

        this.selection.style.left = `${rect.left}px`;
        this.selection.style.top = `${rect.top}px`;
        this.selection.style.width = `${rect.width}px`;
        this.selection.style.height = `${rect.height}px`;
    }

    private cleanup() {
        document.body.removeChild(this.overlay);
        document.body.removeChild(this.selection);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    start() {
        console.log('Screenshot selector started');
    }
}

(window as any).ScreenshotSelector = ScreenshotSelector;
