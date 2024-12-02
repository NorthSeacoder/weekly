export class TextSelector {
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
            background: rgba(0, 0, 0, 0.1);
            z-index: 10000;
            cursor: crosshair;
        `;

        // 创建选择框
        this.selection = document.createElement('div');
        this.selection.style.cssText = `
            position: fixed;
            border: 2px solid #22c55e;
            background: rgba(34, 197, 94, 0.1);
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

        // 获取区域内的所有文本
        const text = this.getTextFromArea(rect);

        // 临时隐藏选择器UI
        this.overlay.style.display = 'none';
        this.selection.style.display = 'none';

        // 等待一帧以确保UI已隐藏
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // 发送消息到 background 进行处理
        chrome.runtime.sendMessage({
            action: 'textSelected',
            data: {
                text,
                url: window.location.href,
                area: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            }
        });

        // 清理
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

    private getTextFromArea(rect: DOMRect): string {
        // 获取区域内的所有元素，使用 elementsFromPoint 在区域内多个点取样
        const getElementsAtPoint = (x: number, y: number) =>
            document.elementsFromPoint(x, y).filter((el) => el !== this.overlay && el !== this.selection);

        // 在选择区域内创建更密集的采样网格
        const samplePoints: [number, number][] = [];
        const gridSize = 30; // 网格大小

        // 水平方向的采样点
        for (let x = rect.left + 10; x < rect.right - 10; x += gridSize) {
            // 顶部和底部
            samplePoints.push([x, rect.top + 10]);
            samplePoints.push([x, rect.bottom - 10]);
        }

        // 垂直方向的采样点
        for (let y = rect.top + 10; y < rect.bottom - 10; y += gridSize) {
            // 左侧和右侧
            samplePoints.push([rect.left + 10, y]);
            samplePoints.push([rect.right - 10, y]);
        }

        // 中心区域的采样点
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        samplePoints.push([centerX, centerY]);
        samplePoints.push([centerX - 20, centerY]);
        samplePoints.push([centerX + 20, centerY]);
        samplePoints.push([centerX, centerY - 20]);
        samplePoints.push([centerX, centerY + 20]);

        // 获取所有采样点的元素并去重
        const elements = [...new Set(samplePoints.flatMap(([x, y]) => getElementsAtPoint(x, y)))];

        // 创建一个范围来检查元素是否在选择区域内
        const isInRect = (element: Element) => {
            const elementRect = element.getBoundingClientRect();
            // 检查是否有任何重叠
            const overlap = !(
                elementRect.right < rect.left ||
                elementRect.left > rect.right ||
                elementRect.bottom < rect.top ||
                elementRect.top > rect.bottom
            );

            if (!overlap) return false;

            // 计算重叠区域
            const overlapLeft = Math.max(elementRect.left, rect.left);
            const overlapRight = Math.min(elementRect.right, rect.right);
            const overlapTop = Math.max(elementRect.top, rect.top);
            const overlapBottom = Math.min(elementRect.bottom, rect.bottom);

            const overlapWidth = overlapRight - overlapLeft;
            const overlapHeight = overlapBottom - overlapTop;
            const overlapArea = overlapWidth * overlapHeight;

            const elementArea = elementRect.width * elementRect.height;

            // 如果重叠区域超过元素面积的20%，就认为是在区域内
            return overlapArea > elementArea * 0.2;
        };

        // 使用数组存储文本节点及其位置信息
        interface TextInfo {
            text: string;
            top: number;
            left: number;
        }
        const textInfos: TextInfo[] = [];

        // 递归获取所有文本节点
        const getTextNodes = (element: Element): void => {
            if (element === this.overlay || element === this.selection) {
                return;
            }

            // 如果元素不在选择区域内，跳过
            if (!isInRect(element)) {
                return;
            }

            // 处理文本节点
            element.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent?.trim();
                    if (text) {
                        // 获取文本节点的位置信息
                        const range = document.createRange();
                        range.selectNodeContents(node);
                        const rect = range.getBoundingClientRect();
                        textInfos.push({
                            text,
                            top: rect.top,
                            left: rect.left
                        });
                        range.detach();
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    getTextNodes(node as Element);
                }
            });
        };

        // 处理所有元素
        elements.forEach(getTextNodes);

        // 按照从上到下，从左到右的顺序排序
        const sortedTexts = textInfos
            .sort((a, b) => {
                // 如果垂直位置相差超过一定阈值，按垂直位置排序
                const verticalThreshold = 10;
                if (Math.abs(a.top - b.top) > verticalThreshold) {
                    return a.top - b.top;
                }
                // 否则按水平位置排序
                return a.left - b.left;
            })
            .map((info) => info.text);

        // 去重并保持顺序
        return [...new Set(sortedTexts)].join('\n');
    }

    private cleanup() {
        document.body.removeChild(this.overlay);
        document.body.removeChild(this.selection);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    start() {
        console.log('Text selector started');
    }
}

(window as any).TextSelector = TextSelector;
