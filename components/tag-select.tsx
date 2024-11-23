'use client';
import { cn } from "@/lib/utils";
import './tag-select.css';

interface TagSelectProps {
    tags: string[];
    onChange: (selectedTags: string[]) => void;
}

export default function TagSelect({ tags, onChange }: TagSelectProps) {
    const handleTagClick = (tag: string) => {
        const checkbox = document.getElementById(tag) as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            const selectedTags = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(
                (checkbox) => (checkbox as HTMLInputElement).value
            );
            onChange(selectedTags);
        }
    };

    return (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-black/20 backdrop-blur-sm border border-gray-800">
            {tags.map((tag) => (
                <label
                    key={tag}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer",
                        "transition-all duration-200",
                        "hover:bg-gray-800/50",
                        "group"
                    )}
                    onClick={() => handleTagClick(tag)}
                >
                    <input
                        type="checkbox"
                        id={tag}
                        value={tag}
                        className="peer hidden"
                        onChange={(e) => {
                            const selectedTags = Array.from(
                                document.querySelectorAll('input[type="checkbox"]:checked')
                            ).map((checkbox) => (checkbox as HTMLInputElement).value);
                            onChange(selectedTags);
                        }}
                    />
                    <div
                        className={cn(
                            "w-4 h-4 rounded-md transition-all duration-200",
                            "border border-gray-600",
                            "group-hover:border-gray-400",
                            "peer-checked:border-blue-500",
                            "peer-checked:bg-gradient-to-br peer-checked:from-blue-400 peer-checked:to-blue-600",
                            "relative",
                            "after:absolute after:inset-0",
                            "after:flex after:items-center after:justify-center",
                            "after:text-white after:font-bold",
                            "peer-checked:after:content-['✓']",
                            "after:text-xs",
                            "after:opacity-0",
                            "peer-checked:after:opacity-100",
                            "after:transition-opacity after:duration-200"
                        )}
                    />
                    <span className="text-sm text-gray-300 group-hover:text-gray-200">
                        {tag}
                    </span>
                </label>
            ))}
        </div>
    );
}
