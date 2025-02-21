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
    MdVideoLibrary,
    MdDragHandle,
    MdKeyboardArrowRight,
    MdAttachFile,
    MdFileDownload,
    MdEdit
} from 'react-icons/md';
import { supabase } from '../../../../../../utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useDrag } from '../../../../../../contexts/DragContext';

const BLOCK_OPTIONS = [
    { type: 'text', icon: MdTextFields, label: 'Text' },
    { type: 'file', icon: MdAttachFile, label: 'File Upload' },
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
    { type: 'toggle', icon: MdKeyboardArrowRight, label: 'Toggle List' },
];

const calculateAspectRatio = (width, height) => {
    return (height / width) * 100;
};

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
    onFocusPrevious,
    listNumber,
    allowDelete,
    isNoteLoaded,
    onMoveBlock
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const inputRef = useRef(null);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
    const paletteRef = useRef(null);
    const [aspectRatio, setAspectRatio] = useState(null);
    const containerRef = useRef(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commandQuery, setCommandQuery] = useState('');
    const [localWidth, setLocalWidth] = useState(() => {
        return block.properties?.width || (containerRef.current ? containerRef.current.offsetWidth : 500);
    });
    const localWidthRef = useRef(localWidth);
    const { 
        draggedBlock,
        setDraggedBlock,
        draggedIndex,
        setDraggedIndex,
        dropTarget,
        setDropTarget,
        dropPosition,
        setDropPosition
    } = useDrag();
    const [isToggleOpen, setIsToggleOpen] = useState(false);

    const filteredOptions = BLOCK_OPTIONS.filter(option =>
        option.label.toLowerCase().includes(commandQuery.toLowerCase())
    );

    useEffect(() => {
        getProfile();
    }, []);
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

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const container = containerRef.current;
                const originalWidth = container.offsetWidth;
                const originalHeight = container.offsetHeight;
                setAspectRatio(calculateAspectRatio(originalWidth, originalHeight));
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (block.properties?.width) {
            setLocalWidth(block.properties.width);
        }
    }, [block.properties?.width]);

    useEffect(() => {
        localWidthRef.current = localWidth;
    }, [localWidth]);

    useEffect(() => {
        if (block.type === 'toggle') {
            setIsToggleOpen(block.properties?.isOpen || false);
        }
    }, [block.type, block.properties?.isOpen]);

    const adjustTextareaHeight = (element) => {
        if (element) {
            element.style.height = 'auto';
            element.style.height = 40 + 'px';
        }
    };

    const handleKeyDown = (e) => {
        const isListType = ['bullet-list', 'numbered-list', 'checklist'].includes(block.type);

        // Handle Enter key for file blocks
        if (block.type === 'file' && e.key === 'Enter') {
            e.preventDefault();
            onEnterPress(index);
            return;
        }

        // Handle Tab for list items
        if (isListType && e.key === 'Tab') {
            e.preventDefault();
            
            // Get the current block's properties
            const currentIndent = block.properties?.indent || 0;
            
            // Shift + Tab decreases indent, Tab increases indent
            const newIndent = e.shiftKey 
                ? Math.max(0, currentIndent - 1) 
                : Math.min(2, currentIndent + 1);
            
            // Update the block's properties with new indent level
            onChange(block.content, { 
                ...block.properties, 
                indent: newIndent 
            });
            return;
        }

        if (showCommandPalette) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedOptionIndex((prev) =>
                        prev < filteredOptions.length - 1 ? prev + 1 : prev
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
                    if (filteredOptions.length > 0) {
                        handleOptionClick(filteredOptions[selectedOptionIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowCommandPalette(false);
                    setCommandQuery('');
                    break;
                case 'Backspace':
                    e.preventDefault();
                    setCommandQuery(prev => prev.slice(0, -1));
                    break;
                default:
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setCommandQuery(prev => prev + e.key);
                    }
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

        if (e.key === 'Backspace' && block.content === '' && allowDelete) {
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
        setCommandQuery('');
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

    async function getProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                let { data, error, status } = await supabase
                    .from("Profiles")
                    .select(`id, firstname, lastname, avatar`)
                    .eq("id", user.id)
                    .single();

                if (error && status !== 406) {
                    throw error;
                }

                if (data) {
                    setUser({...data, id: user.id});
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleImageUpload = async (file) => {
        try {
            if (!file) return;
            if (!user?.id) {
                throw new Error('Please sign in to upload images');
            }

            // Generate unique file path
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // Upload file to Supabase
            const { error: uploadError } = await supabase.storage
                .from("screenshot")
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("screenshot")
                .getPublicUrl(filePath);

            // Update block content with the public URL
            onChange(urlData.publicUrl);
            setIsEditing(false);

        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.message || 'Error uploading image');
        }
    };

    const handleFileUpload = async (file) => {
        try {
            if (!file) return;
            if (!user?.id) {
                throw new Error('Please sign in to upload files');
            }

            // Generate unique file path
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${user.id}/${fileName}`;

            // Upload file to Supabase
            const { error: uploadError } = await supabase.storage
                .from("file")
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("file")
                .getPublicUrl(filePath);

            // Update block content with file information
            onChange('', {
                ...block.properties,
                fileUrl: urlData.publicUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });

        } catch (error) {
            console.error('Error uploading file:', error);
            alert(error.message || 'Error uploading file');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleResize = (width) => {
        // Update block properties with new width
        const newProperties = {
            ...block.properties,
            width: Math.max(200, Math.min(width, containerRef.current?.offsetWidth || width))
        };
        onChange(block.content, newProperties);
    };

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

    const handlePaste = (e) => {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        handleImageUpload(file);
                    }
                    return;
                }
            }
        }
    };

    const handleDragStart = (e) => {
        setDraggedBlock(block);
        setDraggedIndex(index);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
        if (dropTarget !== null && draggedIndex !== null) {
            const finalPosition = dropPosition === 'after' ? dropTarget + 1 : dropTarget;
            onMoveBlock(draggedIndex, finalPosition);
        }
        setDraggedBlock(null);
        setDraggedIndex(null);
        setDropTarget(null);
        setDropPosition(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (draggedBlock && draggedIndex !== index) {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.clientY;
            const threshold = rect.top + (rect.height / 2);
            
            setDropTarget(index);
            setDropPosition(mouseY < threshold ? 'before' : 'after');
        }
    };

    const handleDragLeave = () => {
        if (dropTarget === index) {
            setDropTarget(null);
        }
    };

    const handleToggleClick = () => {
        const newIsOpen = !isToggleOpen;
        setIsToggleOpen(newIsOpen);
        onChange(block.content, {
            ...block.properties,
            isOpen: newIsOpen
        });
    };

    const handleTableKeyDown = (e, rowIndex, cellIndex, currentInput) => {
        const rows = block.properties.rows || [['']];
        const currentRow = rows[rowIndex];
        
        // Only move when cursor is at the end or start of the text
        const cursorAtEnd = currentInput.selectionStart === currentInput.value.length;
        const cursorAtStart = currentInput.selectionStart === 0;

        switch (e.key) {
            case 'ArrowRight':
                if (cursorAtEnd && cellIndex < currentRow.length - 1) {
                    e.preventDefault();
                    const nextCell = document.querySelector(
                        `[data-row="${rowIndex}"][data-cell="${cellIndex + 1}"]`
                    );
                    nextCell?.focus();
                }
                break;
            case 'ArrowLeft':
                if (cursorAtStart && cellIndex > 0) {
                    e.preventDefault();
                    const prevCell = document.querySelector(
                        `[data-row="${rowIndex}"][data-cell="${cellIndex - 1}"]`
                    );
                    prevCell?.focus();
                }
                break;
            case 'ArrowUp':
                if (rowIndex > 0) {
                    e.preventDefault();
                    const upCell = document.querySelector(
                        `[data-row="${rowIndex - 1}"][data-cell="${cellIndex}"]`
                    );
                    upCell?.focus();
                }
                break;
            case 'ArrowDown':
                if (rowIndex < rows.length - 1) {
                    e.preventDefault();
                    const downCell = document.querySelector(
                        `[data-row="${rowIndex + 1}"][data-cell="${cellIndex}"]`
                    );
                    downCell?.focus();
                }
                break;
        }
    };

    const renderInput = () => {
        const commonProps = {
            ref: inputRef,
            value: block.content,
            onChange: (e) => {
                onChange(e.target.value);
                adjustTextareaHeight(e.target);
            },
            onKeyDown: handleKeyDown,
            onPaste: handlePaste,
            className: "w-full p-2 border-none focus:ring-0 resize-none overflow-hidden",
            rows: 1,
            style: { minHeight: '1.5rem' }
        };

        switch (block.type) {   
            case 'text':
                return <textarea {...commonProps} className='bg-transparent'/>;
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
                    <div className="relative group" ref={containerRef}>
                        <div className="p-2">
                            {isEditing ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={block.content}
                                            onChange={(e) => onChange(e.target.value)}
                                            onPaste={handlePaste}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    setIsEditing(false);
                                                }
                                            }}
                                            className="w-full p-2 border rounded"
                                            placeholder="Paste image URL..."
                                        />
                                        <div className="text-center text-gray-500">- or -</div>
                                        <div className="flex flex-col gap-2">
                                            {loading ? (
                                                            <div className="flex items-center justify-center h-screen">

                                                            <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            
                                                        </div>
                                            ) : user ? (
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e.target.files[0])}
                                                    className="w-full p-2 border rounded"
                                                />
                                            ) : (
                                                <div className="text-center text-red-500">
                                                    Please sign in to upload images
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                                Add Image
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {block.content ? (
                                        <div 
                                            className="relative group cursor-pointer"
                                            onClick={() => setIsEditing(true)}
                                            style={{
                                                width: localWidth ? localWidth : '100%',
                                                paddingBottom: aspectRatio ? `${aspectRatio}%` : '56.25%',
                                                position: 'relative'
                                            }}
                                        >
                                            <Image
                                                src={block.content}
                                                alt="Block image"
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                onError={() => {
                                                    onChange('');
                                                    setIsEditing(true);
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all">
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-white bg-black bg-opacity-50 px-3 py-1 rounded">
                                                        Click to edit
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Resize handle */}
                                            <div
                                                className="absolute bottom-0 right-0 w-4 h-4 cursor-ew-resize opacity-0 group-hover:opacity-100"
                                                style={{ pointerEvents: isNoteLoaded ? 'auto' : 'none' }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    const startX = e.pageX;
                                                    const startWidth = localWidth || containerRef.current?.offsetWidth || 0;
                                                    
                                                    const handleMouseMove = (moveEvent) => {
                                                        const delta = moveEvent.pageX - startX;
                                                        const newWidth = startWidth + delta;
                                                        const computedWidth = Math.max(200, newWidth);
                                                        setLocalWidth(computedWidth);
                                                        localWidthRef.current = computedWidth;
                                                    };
                                                    
                                                    const handleMouseUp = () => {
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                        const newProperties = {
                                                            ...block.properties,
                                                            width: localWidthRef.current
                                                        };
                                                        onChange(block.content, newProperties);
                                                    };
                                                    
                                                    document.addEventListener('mousemove', handleMouseMove);
                                                    document.addEventListener('mouseup', handleMouseUp);
                                                }}
                                            >
                                                <MdDragHandle className="text-white bg-black bg-opacity-50 rounded w-full h-full p-0.5" />
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
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center"
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
            case 'embed':
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
                                    className="relative"
                                    style={{
                                        width: '100%',
                                        paddingBottom: aspectRatio ? `${aspectRatio}%` : '56.25%', // Default 16:9 ratio
                                    }}
                                    onClick={() => !block.content && setIsEditing(true)}
                                >
                                    {block.content ? (
                                        <iframe
                                            src={getEmbedUrl(block.content)}
                                            className="absolute top-0 left-0 w-full h-full rounded"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <MdVideoLibrary className="text-3xl" />
                                                <span>Click to add YouTube URL</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onRemove}
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center"
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
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'divider':
                return (
                    <div className="relative group py-4">
                        <hr className="border-gray-300" />
                        <input
                            type="text"
                            className="w-0 h-0 opacity-0 absolute"
                            ref={inputRef}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                );
            case 'bullet-list':
                return (
                    <div className="flex items-start gap-2 w-full">
                        <div 
                            style={{ 
                                paddingLeft: `${(block.properties?.indent || 0) * 24}px` 
                            }} 
                            className="flex items-start gap-2 w-full"
                        >
                            <span className="text-gray-400 leading-[1.5]">•</span>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden border-none focus:ring-0 p-0 leading-[1.5] min-h-[1em]"
                                placeholder="List item..."
                            />
                        </div>
                    </div>
                );
            case 'numbered-list':
                return (
                    <div className="flex items-start gap-2 w-full">
                        <div 
                            style={{ 
                                paddingLeft: `${(block.properties?.indent || 0) * 24}px` 
                            }} 
                            className="flex items-start gap-2 w-full"
                        >
                            <span className="text-gray-400 leading-[1.5] min-w-[1.5em]">{listNumber}.</span>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden border-none focus:ring-0 p-0 leading-[1.5] min-h-[1em]"
                                placeholder="List item..."
                            />
                        </div>
                    </div>
                );
            case 'checklist':
                return (
                    <div className="relative group w-full">
                        <div className="flex items-start gap-2 w-full">
                            <input
                                type="checkbox"
                                checked={block.properties.checked || false}
                                onChange={(e) =>
                                    onChange(block.content, { ...block.properties, checked: e.target.checked })
                                }
                                className="h-4 w-4 cursor-pointer mt-[0.25em] border-gray-400"
                                onClick={(e) => e.stopPropagation()}
                                tabIndex="-1"
                            />
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none border-none focus:ring-0 bg-transparent p-0 leading-[1.5] min-h-[1em]"
                                placeholder="List item..."
                            />
                        </div>
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
                    </div>
                );
            case 'table':
                return (
                    <div className="relative group">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <tbody>
                                    {(block.properties.rows || [[]]).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td 
                                                    key={cellIndex} 
                                                    className="p-2 border border-gray-200"
                                                >
                                                    <input
                                                        data-row={rowIndex}
                                                        data-cell={cellIndex}
                                                        type="text"
                                                        value={cell}
                                                        onChange={(e) => {
                                                            const newRows = [...block.properties.rows];
                                                            newRows[rowIndex][cellIndex] = e.target.value;
                                                            onChange(block.content, { ...block.properties, rows: newRows });
                                                        }}
                                                        onKeyDown={(e) => handleTableKeyDown(e, rowIndex, cellIndex, e.target)}
                                                        className="w-full border-none focus:ring-0 bg-transparent"
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
                    </div>
                );
            case 'toggle':
                return (
                    <div className="group relative">
                        <div className="flex items-start gap-2">
                            <button
                                onClick={handleToggleClick}
                                className="mt-[0.2em] p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                                <MdKeyboardArrowRight 
                                    className={`transform transition-transform ${
                                        isToggleOpen ? 'rotate-90' : ''
                                    }`}
                                />
                            </button>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden bg-transparent  border-none focus:ring-0 p-0 leading-[1.5] min-h-[1em]"
                                placeholder="Toggle header..."
                            />
                        </div>
                        {isToggleOpen && (
                            <div className="pl-7 mt-1 border-l-2 border-gray-200">
                                <textarea
                                    value={block.properties?.content || ''}
                                    onChange={(e) => {
                                        onChange(block.content, {
                                            ...block.properties,
                                            content: e.target.value
                                        });
                                        adjustTextareaHeight(e.target);
                                    }}
                                    onInput={(e) => adjustTextareaHeight(e.target)}
                                    className="w-full resize-none overflow-hidden bg-transparent border-none focus:ring-0 p-0 leading-[1.5] min-h-[1em]"
                                    placeholder="Toggle content..."
                                />
                            </div>
                        )}
                    </div>
                );
            case 'file':
                return (
                    <div className="group relative mb-2">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-0 h-0 opacity-0 absolute"
                            onKeyDown={handleKeyDown}
                            autoFocus={!block.properties?.fileUrl}
                        />
                        {!block.properties?.fileUrl ? (
                            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                <input
                                    type="file"
                                    onChange={(e) => handleFileUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-center pointer-events-none">
                                    <MdAttachFile className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Click or drag file to upload
                                    </p>
                                </div>
                                <button
                                    onClick={onRemove}
                                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="border rounded-lg bg-gray-50">
                                {/* File Header */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center space-x-3">
                                        <MdAttachFile className="h-6 w-6 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {block.properties.fileName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatFileSize(block.properties.fileSize)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(isTextFile(block.properties.fileName) || 
                                          isPdfFile(block.properties.fileName) || 
                                          isAudioFile(block.properties.fileName) ||
                                          isVideoFile(block.properties.fileName)) && (
                                            <button
                                                onClick={handleFilePreview}
                                                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                            >
                                                {isPreviewLoading ? (
                                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                ) : (
                                                    <span title={
                                                        isPdfFile(block.properties.fileName) ? "Open PDF" : 
                                                        isAudioFile(block.properties.fileName) ? "Play Audio" :
                                                        isVideoFile(block.properties.fileName) ? "Play Video" : 
                                                        "Preview"
                                                    }>
                                                        <MdEdit className="h-5 w-5" />
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        <a
                                            href={block.properties.fileUrl}
                                            download={block.properties.fileName}
                                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                        >
                                            <MdFileDownload className="h-5 w-5" />
                                        </a>
                                        <button
                                            onClick={handleFileDelete}
                                            className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                {/* File Preview */}
                                {filePreviewContent !== null && (
                                    <div className="border-t">
                                        {filePreviewContent === 'media' ? (
                                            <div className="p-4 bg-white">
                                                {isVideoFile(block.properties.fileName) ? (
                                                    <video 
                                                        controls 
                                                        className="w-full max-h-[500px]"
                                                        controlsList="nodownload"
                                                    >
                                                        <source src={block.properties.fileUrl} type={block.properties.fileType} />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                ) : (
                                                    <audio 
                                                        controls 
                                                        className="w-full" 
                                                        controlsList="nodownload"
                                                    >
                                                        <source src={block.properties.fileUrl} type={block.properties.fileType} />
                                                        Your browser does not support the audio tag.
                                                    </audio>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="max-h-[500px] overflow-auto p-4 bg-white">
                                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                                    {filePreviewContent}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            default:
                return renderInput();
        }
    };

    const renderBlock = () => {
        switch (block.type) {
            case 'text':
            case 'heading':
                return (
                    <div className="relative group" key={`block-${index}`}>
                        <div className="relative group">
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={`w-full p-2 border-none focus:ring-0 resize-none overflow-hidden bg-transparent ${
                                    block.type === 'heading' 
                                        ? block.properties?.level === 'h2' 
                                            ? 'text-2xl font-bold' 
                                            : block.properties?.level === 'h3' 
                                                ? 'text-xl font-bold' 
                                                : 'text-3xl font-bold'
                                        : ''
                                }`}
                                rows={1}
                                style={{ minHeight: '1.5rem' }}
                            />
                        </div>
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
                            <textarea
                                ref={inputRef}
                                type="text"
                                value={block.content}
                                onChange={(e) => onChange(e.target.value, block.properties)}
                                onKeyDown={handleKeyDown}
                                className="flex-grow border-none focus:ring-0 bg-transparent"
                                placeholder="List item..."
                            />
                        </div>
                    </div>
                );
            case 'bullet-list':
                return (
                    <div className="flex items-start gap-2 w-full">
                        <div 
                            style={{ 
                                paddingLeft: `${(block.properties?.indent || 0) * 24}px` 
                            }} 
                            className="flex items-start gap-2 w-full"
                        >
                            <span className="text-gray-400 leading-[1.5]">•</span>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden border-none focus:ring-0 p-0 leading-[1.5] min-h-[1.5em]"
                                placeholder="List item..."
                            />
                        </div>
                    </div>
                );
            case 'numbered-list':
                return (
                    <div className="flex items-start gap-2 w-full">
                        <div 
                            style={{ 
                                paddingLeft: `${(block.properties?.indent || 0) * 24}px` 
                            }} 
                            className="flex items-start gap-2 w-full"
                        >
                            <span className="text-gray-400 leading-[1.5] min-w-[1.5em]">{listNumber}.</span>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden border-none focus:ring-0 p-0 leading-[1.5] min-h-[1.5em]"
                                placeholder="List item..."
                            />
                        </div>
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
                    </div>
                );
            case 'table':
                return (
                    <div className="relative group">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <tbody>
                                    {(block.properties.rows || [[]]).map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => (
                                                <td 
                                                    key={cellIndex} 
                                                    className="p-2 border border-gray-200"
                                                >
                                                    <input
                                                        data-row={rowIndex}
                                                        data-cell={cellIndex}
                                                        type="text"
                                                        value={cell}
                                                        onChange={(e) => {
                                                            const newRows = [...block.properties.rows];
                                                            newRows[rowIndex][cellIndex] = e.target.value;
                                                            onChange(block.content, { ...block.properties, rows: newRows });
                                                        }}
                                                        onKeyDown={(e) => handleTableKeyDown(e, rowIndex, cellIndex, e.target)}
                                                        className="w-full border-none focus:ring-0 bg-transparent"
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
                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                );
            case 'divider':
                return (
                    <div className="relative group py-4">
                        <hr className="border-gray-300" />
                        <input
                            type="text"
                            className="w-0 h-0 opacity-0 absolute"
                            ref={inputRef}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                );
            case 'toggle':
                return (
                    <div className="group relative">
                        <div className="flex items-start gap-2">
                            <button
                                onClick={handleToggleClick}
                                className="mt-[0.2em] p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                                <MdKeyboardArrowRight 
                                    className={`transform transition-transform ${
                                        isToggleOpen ? 'rotate-90' : ''
                                    }`}
                                />
                            </button>
                            <textarea
                                ref={inputRef}
                                value={block.content}
                                onChange={(e) => {
                                    onChange(e.target.value, block.properties);
                                    adjustTextareaHeight(e.target);
                                }}
                                onInput={(e) => adjustTextareaHeight(e.target)}
                                onKeyDown={handleKeyDown}
                                className="w-full resize-none overflow-hidden border-none bg-transparent focus:ring-0 p-0 leading-[1.5] min-h-[1em]"
                                placeholder="Toggle header..."
                            />
                        </div>
                        {isToggleOpen && (
                            <div className="pl-7 mt-1 border-l-2 border-gray-200">
                                <textarea
                                    value={block.properties?.content || ''}
                                    onChange={(e) => {
                                        onChange(block.content, {
                                            ...block.properties,
                                            content: e.target.value
                                        });
                                        adjustTextareaHeight(e.target);
                                    }}
                                    onInput={(e) => adjustTextareaHeight(e.target)}
                                    className="w-full resize-none overflow-hidden border-none focus:ring-0 p-0 leading-[1.5] min-h-[1em] h-fit"
                                    placeholder="Toggle content..."
                                />
                            </div>
                        )}
                    </div>
                );
            case 'file':
                return (
                    <div className="group relative mb-2">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-0 h-0 opacity-0 absolute"
                            onKeyDown={handleKeyDown}
                            autoFocus={!block.properties?.fileUrl}
                        />
                        {!block.properties?.fileUrl ? (
                            <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                                <input
                                    type="file"
                                    onChange={(e) => handleFileUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-center pointer-events-none">
                                    <MdAttachFile className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Click or drag file to upload
                                    </p>
                                </div>
                                <button
                                    onClick={onRemove}
                                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div className="border rounded-lg bg-gray-50">
                                {/* File Header */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center space-x-3">
                                        <MdAttachFile className="h-6 w-6 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {block.properties.fileName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatFileSize(block.properties.fileSize)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(isTextFile(block.properties.fileName) || 
                                          isPdfFile(block.properties.fileName) || 
                                          isAudioFile(block.properties.fileName) ||
                                          isVideoFile(block.properties.fileName)) && (
                                            <button
                                                onClick={handleFilePreview}
                                                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                            >
                                                {isPreviewLoading ? (
                                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                ) : (
                                                    <span title={
                                                        isPdfFile(block.properties.fileName) ? "Open PDF" : 
                                                        isAudioFile(block.properties.fileName) ? "Play Audio" :
                                                        isVideoFile(block.properties.fileName) ? "Play Video" : 
                                                        "Preview"
                                                    }>
                                                        <MdEdit className="h-5 w-5" />
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        <a
                                            href={block.properties.fileUrl}
                                            download={block.properties.fileName}
                                            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                        >
                                            <MdFileDownload className="h-5 w-5" />
                                        </a>
                                        <button
                                            onClick={handleFileDelete}
                                            className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                {/* File Preview */}
                                {filePreviewContent !== null && (
                                    <div className="border-t">
                                        {filePreviewContent === 'media' ? (
                                            <div className="p-4 bg-white">
                                                {isVideoFile(block.properties.fileName) ? (
                                                    <video 
                                                        controls 
                                                        className="w-full max-h-[500px]"
                                                        controlsList="nodownload"
                                                    >
                                                        <source src={block.properties.fileUrl} type={block.properties.fileType} />
                                                        Your browser does not support the video tag.
                                                    </video>
                                                ) : (
                                                    <audio 
                                                        controls 
                                                        className="w-full" 
                                                        controlsList="nodownload"
                                                    >
                                                        <source src={block.properties.fileUrl} type={block.properties.fileType} />
                                                        Your browser does not support the audio tag.
                                                    </audio>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="max-h-[500px] overflow-auto p-4 bg-white">
                                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                                    {filePreviewContent}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            default:
                return renderInput();
        }
    };

    const handleFileDelete = async () => {
        try {
            if (!user?.id) return;
            
            // Extract file path from URL
            const urlParts = block.properties.fileUrl.split('file/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0];
                
                // Delete file from storage
                const { error: deleteError } = await supabase.storage
                    .from('file')
                    .remove([filePath]);

                if (deleteError) throw deleteError;
            }
            
            // Clear file properties from block
            onChange('', {});
            
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file');
        }
    };

    const [filePreviewContent, setFilePreviewContent] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const handleFilePreview = async () => {
        try {
            setIsPreviewLoading(true);
            if (isPdfFile(block.properties.fileName)) {
                window.open(block.properties.fileUrl, '_blank');
                setIsPreviewLoading(false);
                return;
            } else if (isAudioFile(block.properties.fileName) || isVideoFile(block.properties.fileName)) {
                setFilePreviewContent('media');
                setIsPreviewLoading(false);
                return;
            }

            const response = await fetch(block.properties.fileUrl);
            const text = await response.text();
            setFilePreviewContent(text);
        } catch (error) {
            console.error('Error previewing file:', error);
            alert('Unable to preview this file');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const isTextFile = (fileName) => {
        const textExtensions = [
            'txt', 'md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 
            'html', 'css', 'json', 'yml', 'yaml', 'xml', 'csv',
            'py', 'java', 'rb', 'c', 'cpp', 'h', 'hpp', 'sql'
        ];
        const extension = fileName?.split('.').pop()?.toLowerCase();
        return textExtensions.includes(extension);
    };

    const isPdfFile = (fileName) => {
        return fileName?.toLowerCase().endsWith('.pdf');
    };

    const isAudioFile = (fileName) => {
        const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        const extension = fileName?.split('.').pop()?.toLowerCase();
        return audioExtensions.includes(extension);
    };

    const isVideoFile = (fileName) => {
        const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
        const extension = fileName?.split('.').pop()?.toLowerCase();
        return videoExtensions.includes(extension);
    };

    return (
        <>
            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`group relative mb-2 ${
                    dropTarget === index 
                        ? dropPosition === 'before'
                            ? 'border-t-2 border-blue-500'
                            : 'border-b-2 border-blue-500'
                        : ''
                }`}
                data-block-index={index}
            >
                <div
                    className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-move p-2"
                >
                    <MdDragHandle />
                </div>
                {renderBlock()}
            </div>
            
            {showCommandPalette && (
                <div
                    className="fixed left-0 mt-1 w-64 bg-white shadow-lg rounded-lg overflow-hidden z-[100] border"
                    style={{
                        top: inputRef.current?.getBoundingClientRect().bottom ?? 0,
                        left: inputRef.current?.getBoundingClientRect().left ?? 0,
                    }}
                >
                    <div className="p-2 border-b">
                        <span>/{commandQuery}</span>
                    </div>
                    <div ref={paletteRef} className="py-2 max-h-64 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, idx) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={`${option.type}-${idx}`}
                                        className={`w-full px-4 py-2 flex items-center gap-3 text-left ${
                                            selectedOptionIndex === idx
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
                            })
                        ) : (
                            <div className="p-2 text-center text-gray-500">No matches</div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default BlockRenderer; 