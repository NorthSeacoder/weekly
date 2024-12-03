import fs from 'fs';
import path from 'path';

export function getDemoFallbackContent(demoPath: string): string {
    try {
        // Read the files directly instead of requiring them
        const demoDir = path.join(process.cwd(), 'demos', demoPath);

        const parts = [];

        // Read HTML
        if (fs.existsSync(path.join(demoDir, 'index.html'))) {
            const html = fs.readFileSync(path.join(demoDir, 'index.html'), 'utf-8');
            parts.push('```html\n' + html + '\n```\n');
        }

        // Read CSS
        if (fs.existsSync(path.join(demoDir, 'index.css'))) {
            const css = fs.readFileSync(path.join(demoDir, 'index.css'), 'utf-8');
            parts.push('```css\n' + css + '\n```\n');
        }

        // Read JS
        if (fs.existsSync(path.join(demoDir, 'index.js'))) {
            const js = fs.readFileSync(path.join(demoDir, 'index.js'), 'utf-8');
            parts.push('```javascript\n' + js + '\n```\n');
        }

        return parts.join('\n');
    } catch (error) {
        console.error(`Failed to load demo files for ${demoPath}:`, error);
        return '<!-- Failed to load demo content -->';
    }
}
