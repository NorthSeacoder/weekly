import MDEditor from '@uiw/react-md-editor'
import React from 'react'
import rehypeSanitize from "rehype-sanitize"

export function MarkdownEditor() {
  const [value, setValue] = React.useState("# Hello World")
  const [preview, setPreview] = React.useState(false)

  return (
    <div className="space-y-2" data-color-mode="light">
      <div className="rounded-xl overflow-hidden border border-border/50 shadow-sm">
        <MDEditor
          value={value}
          onChange={(val) => setValue(val || '')}
          height={400}
          previewOptions={{
            rehypePlugins: [[rehypeSanitize]],
          }}
        />
      </div>
    </div>
  )
}