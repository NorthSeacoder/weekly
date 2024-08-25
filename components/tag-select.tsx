'use client';
import './tag-select.css';
import { useState } from 'react';

interface TagSelectProps {
    tags: string[];
    onChange: (selectedTags: string[]) => void;
}

export default function TagSelect({ tags, onChange }: TagSelectProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const handleChange = (tag: string) => {
        const updatedSelectedTags = selectedTags.includes(tag)
            ? selectedTags.filter((t) => t !== tag)
            : [...selectedTags, tag];

        setSelectedTags(updatedSelectedTags);
        onChange(updatedSelectedTags);
    };

    return (
        <form onSubmit={(event) => {
            event.preventDefault()
            console.log('submit',event)
        }}>
            <fieldset>
                <ul>
                    {tags.map((tag) => {
                        return (
                            <li key={tag}>
                                <label>
                                    <span>{tag}</span>
                                    <span>
                                        <svg
                                            aria-hidden='true'
                                            xmlns='http://www.w3.org/2000/svg'
                                            viewBox='0 0 24 24'
                                            fill='currentColor'>
                                            <path
                                                fillRule='evenodd'
                                                d='M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z'
                                                clipRule='evenodd'
                                            />
                                        </svg>
                                    </span>
                                    <input className='sr-only' type='checkbox' onChange={() => handleChange(tag)} />
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </fieldset>
            <button type='reset'>Reset</button>
        </form>
    );
}
