import { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import Image from 'next/image';
import { 
    MdTitle, 
    MdFormatListBulleted, 
    MdCode, 
    MdImage, 
    MdLink,
    MdTextFields,
    MdFormatListNumbered,
    MdFormatQuote,
    MdOutlineTableChart,
    MdInfo,
    MdHorizontalRule,
    MdVideoLibrary
} from 'react-icons/md';

const BLOCK_OPTIONS = [
    { type: 'text', icon: MdTextFields, label: 'Text' },
    { type: 'heading', icon: MdTitle, label: 'Heading 1' },
    { type: 'heading', icon: MdTitle, label: 'Heading 2', properties: { level: 'h2' } },
    { type: 'heading', icon: MdTitle, label: 'Heading 3', properties: { level: 'h3' } },
    { type: 'bullet-list', icon: MdFormatListBulleted, label: 'Bullet List' },
    { type: 'numbered-list', icon: MdFormatListNumbered, label: 'Numbered List' },
    { type: 'checklist', icon: MdFormatListBulleted, label: 'Checklist' },
    { type: 'quote', icon: MdFormatQuote, label: 'Quote' },
    { type: 'code', icon: MdCode, label: 'Code' },
    { type: 'table', icon: MdOutlineTableChart, label: 'Table' },
    { type: 'callout', icon: MdInfo, label: 'Callout' },
    { type: 'divider', icon: MdHorizontalRule, label: 'Divider' },
    { type: 'image', icon: MdImage, label: 'Image' },
    { type: 'embed', icon: MdVideoLibrary, label: 'Embed' },
    { type: 'link', icon: MdLink, label: 'Link' },
];

const BlockRenderer = ({ 
    block, 
    onChange, 
    onRemove,
    onEnterPress,
    onBackspacePress,
    onSlashCommand,
    index,
    isLastBlock,
    onTransformBlock,
    onFocusNext,
    onFocusPrevious
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const inputRef = useRef(null);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
    const paletteRef = useRef(null);

    useEffect(() => {
        if (inputRef.current && block.content === '') {
            inputRef.current.focus();
        }
    }, [block.type]);

    useEffect(() => {
        if (showCommandPalette) {
            setSelectedOptionIndex(0);
        }
    }, [showCommandPalette]);

    const adjustTextareaHeight = (element) => {
        if (element) {
            element.style.height = 'auto';
            element.style.height = element.scrollHeight + 'px';
        }
    };

    const handleKeyDown = (e) => {
        if (showCommandPalette) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedOptionIndex((prev) => 
                        prev < BLOCK_OPTIONS.length - 1 ? prev + 1 : prev
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedOptionIndex((prev) => 
                        prev > 0 ? prev - 1 : prev
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    handleOptionClick(BLOCK_OPTIONS[selectedOptionIndex]);
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowCommandPalette(false);
                    break;
                default:
                    break;
            }
            return;
        }

        if (block.type === 'checklist') {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (block.content === '') {
                    onBackspacePress(index);
                } else {
                    onEnterPress(index, {
                        type: 'checklist',
                        content: '',
                        properties: { checked: false }
                    });
                }
                return;
            }
        }

        if (['bullet-list', 'numbered-list', 'checklist'].includes(block.type)) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (block.content === '') {
                    onBackspacePress(index);
                    setTimeout(() => onFocusNext(index), 0);
                } else {
                    onEnterPress(index, {
                        type: block.type,
                        content: '',
                        properties: block.type === 'checklist' ? { checked: false } : {}
                    });
                }
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onEnterPress(index);
        }

        if (e.key === 'Backspace' && block.content === '' && !isLastBlock) {
            e.preventDefault();
            onBackspacePress(index);
        }

        if (e.key === '/' && block.content === '') {
            e.preventDefault();
            setShowCommandPalette(true);
            onSlashCommand(index);
        }

        if (e.key === 'ArrowUp' && !e.shiftKey) {
            e.preventDefault();
            onFocusPrevious(index);
            return;
        }

        if (e.key === 'ArrowDown' && !e.shiftKey) {
            e.preventDefault();
            onFocusNext(index);
            return;
        }
    };

    const handleOptionClick = (option) => {
        setShowCommandPalette(false);
        onTransformBlock(index, option.type, option.properties);
        
        if (option.type === 'divider') {
            setTimeout(() => {
                onFocusNext(index);
            }, 0);
        }
    };

    useEffect(() => {
        if (showCommandPalette && paletteRef.current) {
            const selectedElement = paletteRef.current.children[selectedOptionIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedOptionIndex, showCommandPalette]);

    useEffect(() => {
        if (inputRef.current && block.type !== 'code') {
            adjustTextareaHeight(inputRef.current);
        }
    }, [block.content, block.type]);

    const renderInput = () => {
        const commonProps = {
            ref: inputRef,
            value: block.content,
            onChange: (e) => {
                onChange(e.target.value);
                adjustTextareaHeight(e.target);
            },
            onKeyDown: handleKeyDown,
            className: "w-full p-2 border-none focus:ring-0 resize-none overflow-hidden",
            rows: 1,
            style: { minHeight: '1.5rem' }
        };

        switch (block.type) {   
            case 'text':
                return <textarea {...commonProps} />;
            case 'heading':
                return (
                    <textarea
                        {...commonProps}
                        className={`${commonProps.className} ${
                            block.properties.level === 'h2' ? 'text-2xl font-bold' :
                            block.properties.level === 'h3' ? 'text-xl font-bold' :
                            'text-3xl font-bold'
                        }`}
                    />
                );
            case 'code':
                return (
                    <div className="relative group">
                        <CodeMirror
                            value={block.content}
                            height="200px"
                            extensions={[javascript()]}
                            onChange={(value) => onChange(value)}
                            className="border rounded"
                        />
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'image':
                return (
                    <div className="relative group">
                        <div className="p-2">
                            {isEditing ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={block.content}
                                        onChange={(e) => onChange(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                setIsEditing(false);
                                            }
                                        }}
                                        className="w-full p-2 border rounded"
                                        placeholder="Paste image URL..."
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Add Image
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {block.content ? (
                                        <div 
                                            className="relative group cursor-pointer"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <div className="relative aspect-video">
                                                <Image
                                                    src={block.content}
                                                    alt="Block image"
                                                    fill
                                                    className="object-contain"
                                                    onError={() => {
                                                        onChange(''); // Clear invalid image URL
                                                        setIsEditing(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all">
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                                                        Click to edit
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="w-full p-8 border-2 border-dashed rounded hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex flex-col items-center gap-2 text-gray-500">
                                                <MdImage className="text-3xl" />
                                                <span>Click to add image URL</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'link':
                return (
                    <div className="relative group p-2">
                        {isEditing ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    {...commonProps}
                                    placeholder="Enter URL..."
                                />
                                <input
                                    type="text"
                                    value={block.properties.text || ''}
                                    onChange={(e) => onChange(block.content, { ...block.properties, text: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    placeholder="Enter link text..."
                                />
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="self-end px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Save
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => setIsEditing(true)}>
                                <a
                                    href={block.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {block.properties.text || block.content}
                                </a>
                            </div>
                        )}
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderBlock = () => {
        switch (block.type) {
            case 'text':
            case 'heading':
                return (
                    <div className="relative group">
                        {renderInput()}
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'checklist':
                return (
                    <div className="relative group">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={block.properties.checked || false}
                                onChange={(e) => onChange(block.content, { ...block.properties, checked: e.target.checked })}
                                className="h-4 w-4 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                                tabIndex="-1"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={block.content}
                                onChange={(e) => onChange(e.target.value, block.properties)}
                                onKeyDown={handleKeyDown}
                                className="flex-grow border-none focus:ring-0 bg-transparent"
                                placeholder="List item..."
                            />
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'bullet-list':
                return (
                    <div className="relative group">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">•</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={block.content}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-grow border-none focus:ring-0 bg-transparent"
                                placeholder="List item..."
                            />
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'numbered-list':
                return (
                    <div className="relative group">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 min-w-[1.5em]">{index + 1}.</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={block.content}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-grow border-none focus:ring-0 bg-transparent"
                                placeholder="List item..."
                            />
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'quote':
                return (
                    <div className="relative group">
                        <div className="pl-4 border-l-4 border-gray-300">
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full border-none focus:ring-0 bg-transparent italic"
                                placeholder="Enter quote..."
                            />
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'table':
                return (
                    <div className="relative group">
                        <div className="border rounded overflow-hidden">
                            <table className="w-full">
                                <tbody>
                                    {(block.properties.rows || [[]]).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="border-gray-500 border p-2">
                                                    <input
                                                        type="text"
                                                        value={cell}
                                                        onChange={(e) => {
                                                            const newRows = [...block.properties.rows];
                                                            newRows[rowIndex][cellIndex] = e.target.value;
                                                            onChange(block.content, { ...block.properties, rows: newRows });
                                                        }}
                                                        className="w-full border-none focus:ring-0"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-end gap-2 p-2 border-t">
                                <button
                                    onClick={() => {
                                        const newRows = [...(block.properties.rows || [['']])];
                                        newRows.push(new Array(newRows[0].length).fill(''));
                                        onChange(block.content, { ...block.properties, rows: newRows });
                                    }}
                                    className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                                >
                                    Add Row
                                </button>
                                <button
                                    onClick={() => {
                                        const newRows = block.properties.rows || [['']];
                                        newRows.forEach(row => row.push(''));
                                        onChange(block.content, { ...block.properties, rows: newRows });
                                    }}
                                    className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                                >
                                    Add Column
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'callout':
                return (
                    <div className="relative group">
                        <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
                            <MdInfo className="text-blue-500 text-xl flex-shrink-0" />
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full border-none focus:ring-0 bg-transparent"
                                placeholder="Add a callout..."
                            />
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'divider':
                return (
                    <div className="relative group py-4">
                        <hr className="border-gray-300" />
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                        <input
                            type="text"
                            className="w-0 h-0 opacity-0 absolute"
                            ref={inputRef}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                );
            case 'embed':
                const getEmbedUrl = (url) => {
                    try {
                        // Handle YouTube URLs
                        if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            const videoId = url.includes('youtube.com') 
                                ? url.split('v=')[1]?.split('&')[0]
                                : url.split('youtu.be/')[1]?.split('?')[0];
                            if (videoId) {
                                return `https://www.youtube.com/embed/${videoId}`;
                            }
                        }
                        // Handle other embed types here if needed
                        return url;
                    } catch (e) {
                        return url;
                    }
                };

                return (
                    <div className="relative group">
                        {isEditing ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => onChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setIsEditing(false);
                                        }
                                    }}
                                    className="w-full p-2 border rounded"
                                    placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
                                    autoFocus
                                />
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="self-end px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Embed
                                </button>
                            </div>
                        ) : (
                            <div 
                                className="aspect-video bg-gray-100 rounded"
                                onClick={() => !block.content && setIsEditing(true)}
                            >
                                {block.content ? (
                                    <iframe
                                        src={getEmbedUrl(block.content)}
                                        className="w-full h-full rounded"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <MdVideoLibrary className="text-3xl" />
                                            <span>Click to add YouTube URL</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                );
            default:
                return renderInput();
        }
    };

    return (
        <>
            {renderBlock()}
            {showCommandPalette && (
                <div className="absolute left-0 mt-1 w-64 bg-white shadow-lg rounded-lg overflow-hidden z-50 border">
                    <div 
                        ref={paletteRef}
                        className="py-2 max-h-64 overflow-y-auto"
                    >
                        {BLOCK_OPTIONS.map((option, idx) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={`${option.type}-${idx}`}
                                    className={`w-full px-4 py-2 flex items-center gap-3 text-left
                                        ${selectedOptionIndex === idx 
                                            ? 'bg-blue-50 text-blue-600' 
                                            : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => handleOptionClick(option)}
                                    onMouseEnter={() => setSelectedOptionIndex(idx)}
                                >
                                    <Icon className={`text-xl ${
                                        selectedOptionIndex === idx 
                                            ? 'text-blue-600' 
                                            : 'text-gray-500'
                                    }`} />
                                    <span>{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default BlockRenderer; 