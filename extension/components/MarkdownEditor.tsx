import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export function MarkdownEditor({value, onChange}: MarkdownEditorProps) {
    return (
        <div className='space-y-2' data-color-mode='light'>
            <div className='rounded-xl overflow-hidden border border-border/50 shadow-sm'>
                <MDEditor
                    value={value}
                    onChange={(val) => onChange(val || '')}
                    height={400}
                    previewOptions={{
                        rehypePlugins: [[rehypeSanitize]]
                    }}
                />
            </div>
        </div>
    );
}
