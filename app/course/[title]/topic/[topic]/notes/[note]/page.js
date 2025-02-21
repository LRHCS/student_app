"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DragProvider } from '../../../../../../contexts/DragContext';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import { supabase } from "../../../../../../utils/client";
import { FaPlus, FaShare } from 'react-icons/fa';
import { 
    MdTitle, 
    MdFormatListBulleted, 
    MdCode, 
    MdImage, 
    MdLink,
    MdDragIndicator,
    MdFormatListNumbered,
    MdFormatQuote,
    MdOutlineTableChart ,
    MdInfo,
    MdHorizontalRule,
    MdVideoLibrary,
    MdTextFields,
    MdKeyboardArrowRight,
    MdEdit
} from 'react-icons/md';
import BlockRenderer from './BlockRenderer';
import DrawingLayer from './components/DrawingLayer';
import { isValidImageUrl } from '../../../../../../utils/imageUtils';
import { useDrag } from '../../../../../../contexts/DragContext';
import MindMap from './components/MindMap';
import NoteFooter from './components/NoteFooter';
import LoadingCard from '../../../../../../components/LoadingCard';

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirror = dynamic(
    () => import('@uiw/react-codemirror').then(mod => mod.default),
    { ssr: false }
);

const BLOCK_TYPES = {
    TEXT: 'text',
    HEADING: 'heading',
    BULLET_LIST: 'bullet-list',
    NUMBERED_LIST: 'numbered-list',
    CHECKLIST: 'checklist',
    CODE: 'code',
    IMAGE: 'image',
    LINK: 'link',
    QUOTE: 'quote',
    TABLE: 'table',
    CALLOUT: 'callout',
    DIVIDER: 'divider',
    TOGGLE: 'toggle',
    EMBED: 'embed'
};

const BLOCK_OPTIONS = [
    { type: 'text', icon: MdTextFields, label: 'Text' },
    { type: 'heading', icon: MdTitle, label: 'Heading 1' },
    { type: 'heading', icon: MdTitle, label: 'Heading 2', properties: { level: 'h2' } },
    { type: 'heading', icon: MdTitle, label: 'Heading 3', properties: { level: 'h3' } },
    { type: 'toggle', icon: MdKeyboardArrowRight, label: 'Toggle List' },
    { type: 'bullet-list', icon: MdFormatListBulleted, label: 'Bullet List' },
    { type: 'numbered-list', icon: MdFormatListNumbered, label: 'Numbered List' },
    { type: 'checklist', icon: MdFormatListBulleted, label: 'Checklist' },
    { type: 'quote', icon: MdFormatQuote, label: 'Quote' },
    { type: 'code', icon: MdCode, label: 'Code' },
    { type: 'table', icon: MdOutlineTableChart , label: 'Table' },
    { type: 'callout', icon: MdInfo, label: 'Callout' },
    { type: 'divider', icon: MdHorizontalRule, label: 'Divider' },
    { type: 'image', icon: MdImage, label: 'Image' },
    { type: 'embed', icon: MdVideoLibrary, label: 'Embed' },
    { type: 'link', icon: MdLink, label: 'Link' },
];

function NotePage({ params }) {
    const pathname = usePathname();
    const [blocks, setBlocks] = useState([]);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [title, setTitle] = useState("");
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [pendingImageUrl, setPendingImageUrl] = useState(null);
    const [pasteIndex, setPasteIndex] = useState(null);
    const [isNoteLoaded, setIsNoteLoaded] = useState(false);
    const { 
        draggedBlock, 
        setDropTarget, 
        setDropPosition, 
        dropTarget 
    } = useDrag();
    const [showMindMap, setShowMindMap] = useState(true);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const mindMapRef = useRef(null);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const courseTitle = decodeURIComponent(pathname.split('/')[2]);
    const topicTitle = decodeURIComponent(pathname.split('/')[4]);
    const lessonId = decodeURIComponent(pathname.split('/')[6]);

    useEffect(() => {
        fetchNote();
        const fetchTitle = async () => {
            const fetchedTitle = await noteTitle();
            setTitle(fetchedTitle);
        };
        fetchTitle();
    }, [lessonId]);

    useEffect(() => {
        console.log('Droppable mounted');
        return () => console.log('Droppable unmounted');
    }, []);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1200);
        };

        // Initial check
        checkScreenSize();

        // Add event listener
        window.addEventListener('resize', checkScreenSize);

        // Cleanup
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const fetchNote = async () => {
        if (!lessonId) return;
        setIsNoteLoaded(false);

        const { data, error } = await supabase
            .from('Lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching lesson:', error.message);
            setBlocks([createDefaultBlock()]);
            setIsNoteLoaded(true);
        } else if (data) {
            try {
                const parsedContent = JSON.parse(data.content || '[]');
                const validBlocks = parsedContent.map(block => ({
                    ...block,
                    id: block.id || uuidv4()
                }));
                setBlocks(validBlocks.length ? validBlocks : [createDefaultBlock()]);
                setTimeout(() => setIsNoteLoaded(true), 0);
            } catch (e) {
                console.error('Error parsing content:', e);
                setBlocks([createDefaultBlock()]);
                setIsNoteLoaded(true);
            }
        }
    };

    const createDefaultBlock = () => ({
        id: uuidv4(),
        type: BLOCK_TYPES.TEXT,
        content: '',
        properties: {}
    });

    const saveNote = async (updatedBlocks) => {
        if (!lessonId) return;

        const { error } = await supabase
            .from('Lessons')
            .update({ content: JSON.stringify(updatedBlocks) })
            .eq('id', lessonId);

        if (error) {
            console.error('Error saving note:', error.message);
        }
    };

    const handleBlockChange = (id, content, properties = {}) => {
        const updatedBlocks = blocks.map(block => 
            block.id === id ? { ...block, content, properties } : block
        );
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
    };

    const addBlock = (type, index) => {
        const newBlock = {
            id: uuidv4(),
            type,
            content: '',
            properties: {}
        };
        const updatedBlocks = [
            ...blocks.slice(0, index + 1),
            newBlock,
            ...blocks.slice(index + 1)
        ];
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
        setShowBlockMenu(false);
    };

    const removeBlock = async (index) => {
        const removedBlock = blocks[index];

        // If the block is an image and its URL indicates a file from the "screenshot" bucket,
        // extract the file path and remove it from Supabase storage.
        if (
            removedBlock.type === 'image' &&
            removedBlock.content &&
            removedBlock.content.includes('storage/v1/object/public/screenshot/')
        ) {
            const parts = removedBlock.content.split('storage/v1/object/public/screenshot/');
            if (parts.length > 1) {
                // Remove any potential query parameters from the file path.
                const filePath = parts[1].split('?')[0];
                const { error } = await supabase.storage
                    .from('screenshot')
                    .remove([filePath]);
                if (error) {
                    console.error("Error deleting screenshot from Supabase:", error.message);
                }
            }
        }

        if (blocks.length === 1) {
            setBlocks([createDefaultBlock()]);
            return;
        }
        const updatedBlocks = blocks.filter((_, i) => i !== index);
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(blocks);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, {
            ...reorderedItem,
            id: String(reorderedItem.id)
        });

        setBlocks(items);
        saveNote(items);
    };

    const noteTitle = async () => {
        const { data, error } = await supabase
            .from('Lessons')
            .select('title')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching note title:', error.message);
            return null;
        }

        return data?.title || 'Untitled';
    };

    const handleEnterPress = (index) => {
        const currentBlock = blocks[index];

        // For list items, if the current block is empty
        if (['bullet-list', 'numbered-list', 'checklist'].includes(currentBlock.type) &&
            currentBlock.content.trim() === '') {
            if (index === blocks.length - 1) {
                // Remove the empty last item and then add a new empty list item at the end
                const updatedBlocks = blocks.filter((_, i) => i !== index);
                // Append a new block of the same list type with preserved indent
                updatedBlocks.push({
                    ...createDefaultBlock(),
                    type: currentBlock.type,
                    properties: { ...currentBlock.properties }
                });
                setBlocks(updatedBlocks);
                saveNote(updatedBlocks);
                return;
            }
        }

        // Normal behavior: insert a new block immediately below with same list style if applicable
        const newBlock = {
            ...createDefaultBlock(),
            ...((['bullet-list', 'numbered-list', 'checklist'].includes(currentBlock.type)) && {
                type: currentBlock.type,
                properties: {
                    ...currentBlock.properties,
                    indent: currentBlock.properties?.indent || 0
                }
            })
        };

        const updatedBlocks = [
            ...blocks.slice(0, index + 1),
            newBlock,
            ...blocks.slice(index + 1)
        ];
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
    };

    const handleBackspacePress = (index) => {
        const currentBlock = blocks[index];
        const isListType = ['bullet-list', 'numbered-list', 'checklist'].includes(currentBlock.type);

        // If it's an indented list item, reduce its indent
        if (isListType && currentBlock.properties?.indent > 0) {
            const newProperties = {
                ...currentBlock.properties,
                indent: currentBlock.properties.indent - 1
            };
            handleBlockChange(currentBlock.id, currentBlock.content, newProperties);
            return;
        }

        // For list items:
        if (isListType && currentBlock.content.trim() === '') {
            // Remove the block and keep focus in the area
            const updatedBlocks = blocks.filter((_, i) => i !== index);
            // If we're removing the last block, add a new empty text block
            if (index === blocks.length - 1 && updatedBlocks.length === 0) {
                updatedBlocks.push(createDefaultBlock());
            }
            setBlocks(updatedBlocks);
            saveNote(updatedBlocks);
            // Focus on the new last line
            setTimeout(() => {
                const newLastIndex = updatedBlocks.length - 1;
                const lastBlock = document.querySelector(`[data-block-index="${newLastIndex}"]`);
                if (lastBlock) {
                    const input = lastBlock.querySelector('input[type="text"], textarea');
                    if (input) {
                        input.focus();
                        if (input.setSelectionRange) {
                            const length = input.value.length;
                            input.setSelectionRange(length, length);
                        }
                    }
                }
            }, 0);
            return;
        }

        // For non-list blocks or non-empty content
        if (currentBlock.content === '' && blocks.length > 1) {
            const updatedBlocks = blocks.filter((_, i) => i !== index);
            setBlocks(updatedBlocks);
            saveNote(updatedBlocks);
            // Focus on the new last line
            setTimeout(() => {
                const newLastIndex = updatedBlocks.length - 1;
                const lastBlock = document.querySelector(`[data-block-index="${newLastIndex}"]`);
                if (lastBlock) {
                    const input = lastBlock.querySelector('input[type="text"], textarea');
                    if (input) {
                        input.focus();
                        if (input.setSelectionRange) {
                            const length = input.value.length;
                            input.setSelectionRange(length, length);
                        }
                    }
                }
            }, 0);
        }
    };

    const handleSlashCommand = (index) => {
        // This will be handled by the BlockRenderer's command palette
        console.log('Slash command triggered at index:', index);
    };

    const transformBlock = (index, newType, properties = {}) => {
        const updatedBlocks = blocks.map((block, i) => {
            if (i === index) {
                return {
                    ...block,
                    type: newType,
                    properties: properties
                };
            }
            return block;
        });
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);

        // If transforming to a divider, ensure there's a next block
        if (newType === 'divider' && index === blocks.length - 1) {
            const newBlock = createDefaultBlock();
            const blocksWithNew = [...updatedBlocks, newBlock];
            setBlocks(blocksWithNew);
            saveNote(blocksWithNew);
        }
    };

    // Update the focusNextBlock function
    const focusNextBlock = (currentIndex) => {
        setTimeout(() => {
            const nextBlock = document.querySelector(`[data-block-index="${currentIndex + 1}"]`);
            if (nextBlock) {
                const input = nextBlock.querySelector('input[type="text"], textarea');
                if (input) {
                    const length = input.value.length;
                    input.focus();
                    // Only set selection range for text inputs and textareas
                    if (input.type !== 'checkbox' && input.setSelectionRange) {
                        input.setSelectionRange(length, length);
                    }
                }
            } else {
                // If there's no next block, create a new text block
                const newBlock = createDefaultBlock();
                const updatedBlocks = [...blocks, newBlock];
                setBlocks(updatedBlocks);
                saveNote(updatedBlocks);
                
                // Focus the new block after it's created
                setTimeout(() => {
                    const newBlockElement = document.querySelector(`[data-block-index="${blocks.length}"]`);
                    if (newBlockElement) {
                        const input = newBlockElement.querySelector('input[type="text"], textarea');
                        if (input) {
                            const length = input.value.length;
                            input.focus();
                            if (input.type !== 'checkbox' && input.setSelectionRange) {
                                input.setSelectionRange(length, length);
                            }
                        }
                    }
                }, 0);
            }
        }, 0);
    };

    // Update the focusPreviousBlock function
    const focusPreviousBlock = (currentIndex) => {
        if (currentIndex === 0) return;
        
        setTimeout(() => {
            const previousBlock = document.querySelector(`[data-block-index="${currentIndex - 1}"]`);
            if (previousBlock) {
                const input = previousBlock.querySelector('input[type="text"], textarea');
                if (input) {
                    const length = input.value.length;
                    input.focus();
                    // Only set selection range for text inputs and textareas
                    if (input.type !== 'checkbox' && input.setSelectionRange) {
                        input.setSelectionRange(length, length);
                    }
                }
            }
        }, 0);
    };

    // Update the handleContainerClick function
    const handleContainerClick = (e) => {
        // Only proceed if clicking directly on the container (not on blocks)
        if (e.target === e.currentTarget || 
            (e.target.classList && e.target.classList.contains('note-bottom-area'))) {
            
            // If the last block is empty, focus it
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && lastBlock.content.trim() === '') {
                focusLastBlock();
                return;
            }

            // Otherwise create a new block
            const newBlock = createDefaultBlock();
            const updatedBlocks = [...blocks, newBlock];
            setBlocks(updatedBlocks);
            saveNote(updatedBlocks);
            
            // Focus the new block after it's created
            setTimeout(() => {
                const lastBlockElement = document.querySelector(`[data-block-index="${updatedBlocks.length - 1}"]`);
                if (lastBlockElement) {
                    const input = lastBlockElement.querySelector('input[type="text"], textarea');
                    if (input) {
                        input.focus();
                    }
                }
            }, 0);
        }
    };

    // Add a new function to focus the last block
    const focusLastBlock = () => {
        const lastIndex = blocks.length - 1;
        const lastBlockElement = document.querySelector(`[data-block-index="${lastIndex}"]`);
        if (lastBlockElement) {
            const input = lastBlockElement.querySelector('input[type="text"], textarea');
            if (input) {
                input.focus();
                const length = input.value.length;
                input.setSelectionRange(length, length);
            }
        }
    };

    const handleContainerPaste = async (e) => {
        // Get the index where we should insert the new block
        const targetElement = e.target;
        const blockElement = targetElement.closest('[data-block-index]');
        const index = blockElement ? parseInt(blockElement.getAttribute('data-block-index')) : blocks.length;
        
        // Handle image files from clipboard
        if (e.clipboardData.files.length > 0) {
            const file = e.clipboardData.files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                await handleImageUpload(file, index);
                return;
            }
        }

        // Handle text paste
        const text = e.clipboardData.getData('text');
        if (text) {
            // If it looks like an image URL, ask for confirmation
            if (await isValidImageUrl(text)) {
                e.preventDefault();
                setPendingImageUrl(text);
                setPasteIndex(index);
                return;
            }
        }
    };

    const handleImageUpload = async (file, index) => {
        try {
            if (!file) return;

            const { data: { user } } = await supabase.auth.getUser();
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

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("screenshot")
                .getPublicUrl(filePath);

            // Create new image block
            const newBlock = {
                id: uuidv4(),
                type: 'image',
                content: urlData.publicUrl,
                properties: {}
            };

            // Insert the new block at the specified index
            const updatedBlocks = [
                ...blocks.slice(0, index + 1),
                newBlock,
                ...blocks.slice(index + 1)
            ];
            setBlocks(updatedBlocks);
            saveNote(updatedBlocks);

        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.message || 'Error uploading image');
        }
    };

    const handleMoveBlock = (fromIndex, toIndex) => {
        const updatedBlocks = [...blocks];
        const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
        updatedBlocks.splice(toIndex, 0, movedBlock);
        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
    };

    const computeListNumber = (block, index, blocks) => {
        if (block.type !== 'numbered-list') return undefined;
        
        if (index === 0 || blocks[index - 1].type !== 'numbered-list') {
            return 1;
        }
        
        let count = 1;
        let j = index - 1;
        while (j >= 0 && blocks[j].type === 'numbered-list') {
            count++;
            j--;
        }
        return count;
    };

    // Add debounced drawing mode toggle
    const toggleDrawingMode = useCallback(() => {
        // Pre-initialize drawing layer before showing
        if (!isDrawingMode) {
            // Force a repaint before showing drawing layer
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsDrawingMode(true);
                });
            });
        } else {
            setIsDrawingMode(false);
        }
    }, [isDrawingMode]);

    // Update the toggle handler
    const handleMindMapToggle = () => {
        setShowMindMap(prev => {
            const newValue = !prev;
            if (newValue && mindMapRef.current) {
                // Center the mindmap when showing it
                setTimeout(() => {
                    mindMapRef.current.centerMindMap();
                }, 0);
            }
            return newValue;
        });
    };

    const generateShareUrl = () => {
        // Create a special URL format that includes a share token
        const baseUrl = window.location.origin;
        const sharePath = pathname.replace('/notes/', '/shared/');
        return `${baseUrl}${sharePath}`;
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            // Add the current user to the shared_list
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('Lessons')
                .update({
                    shared_list: supabase.sql`
                        coalesce(shared_list, '[]'::jsonb) || ${JSON.stringify([user.id])}::jsonb
                    `
                })
                .eq('id', lessonId);

            if (error) throw error;

            // Generate and set the share URL
            const url = generateShareUrl();
            setShareUrl(url);
            setShowShareDialog(true);
        } catch (error) {
            console.error('Error sharing note:', error);
            alert('Failed to share note');
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert('Share link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy link');
        }
    };

    return (
        <div className="flex flex-col bg-white h-screen overflow-hidden">
            <div className="sticky top-0 z-50 bg-gray-100 shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-300">
                    <div>
                        <Link href="../../../../../" className="hover:underline">
                            Dashboard
                        </Link>
                        <span className="mx-2 text-gray-500">/</span>
                        <Link href="../../../" className="hover:underline">
                            {courseTitle}
                        </Link>
                        <span className="mx-2 text-gray-500">/</span>
                        <Link href=".." className="hover:underline">
                            {topicTitle}
                        </Link>
                        <span className="mx-2 text-gray-500">/</span>
                        <span className="font-bold">{title}</span>
                    </div>
                    <div className="flex gap-2">
                        {isSmallScreen && (
                            <button
                                onClick={handleMindMapToggle}
                                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                                {showMindMap ? 'Show Note' : 'Show Mind Map'}
                            </button>
                        )}
                        <button
                            onClick={toggleDrawingMode}
                            className={`p-2 rounded-full ${isDrawingMode ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            title="Toggle drawing mode"
                        >
                            <MdEdit className="text-xl" />
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
                            title="Share note"
                            disabled={isSharing}
                        >
                            <FaShare className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Note Content */}
                <div 
                    className={`${
                        isSmallScreen 
                            ? showMindMap ? 'hidden' : 'w-full' 
                            : 'w-1/2'
                    } border-r border-gray-200 z-30 bg-white flex flex-col h-full`}
                >
                    <div className="note-content-container flex-1 overflow-y-auto ">
                        {/* Pre-mount DrawingLayer but keep it hidden when inactive */}
                        <div style={{ visibility: isDrawingMode ? 'visible' : 'hidden' }}>
                            <DrawingLayer isActive={isDrawingMode} lessonId={lessonId} />
                        </div>
                        
                        {isNoteLoaded ? (
                            <div 
                                className="flex-grow p-4 max-w-4xl mx-auto w-full"
                                onClick={handleContainerClick}
                                onPaste={handleContainerPaste}
                            >
                                <div className="min-h-full relative">
                                    {blocks.map((block, index) => (
                                        <BlockRenderer
                                            key={`block-${block.id || uuidv4()}`}
                                            block={block}
                                            index={index}
                                            onChange={(content, properties) => 
                                                handleBlockChange(block.id, content, properties)
                                            }
                                            onRemove={() => removeBlock(index)}
                                            onEnterPress={handleEnterPress}
                                            onBackspacePress={handleBackspacePress}
                                            onSlashCommand={handleSlashCommand}
                                            onTransformBlock={transformBlock}
                                            isLastBlock={index === blocks.length - 1}
                                            onFocusNext={focusNextBlock}
                                            onFocusPrevious={focusPreviousBlock}
                                            listNumber={block.type === 'numbered-list' ? computeListNumber(block, index, blocks) : undefined}
                                            allowDelete={blocks.length > 1}
                                            isNoteLoaded={isNoteLoaded}
                                            onMoveBlock={handleMoveBlock}
                                        />
                                    ))}
                                    {/* Add a clickable area below the last block */}
                                    <div 
                                        className="note-bottom-area min-h-[50vh] w-full cursor-text"
                                        onClick={handleContainerClick}
                                    />
                                </div>
                                
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-screen">
                                <LoadingCard className="min-w-[300px]" />
                            </div>
                        )}                    
                        
                    </div>
                    <NoteFooter lessonId={lessonId} title={title} />
                </div>

                {/* Mind Map */}
                <div 
                    className={`${
                        isSmallScreen
                            ? showMindMap ? 'w-full' : 'hidden'
                            : 'w-1/2'
                    } border-l border-gray-200 bg-white z-10 overflow-hidden`}
                >
                    <div className="h-full">
                        <MindMap 
                            lessonId={lessonId} 
                            title={title} 
                        />
                    </div>
                </div>
            </div>

            {showBlockMenu !== false && (
                <div
                    className="fixed bg-white shadow-lg rounded-lg p-2 z-50"
                    style={{
                        top: menuPosition.y,
                        left: menuPosition.x
                    }}
                >
                    <div className="flex flex-col gap-1">
                        {BLOCK_OPTIONS.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => addBlock(option.type, showBlockMenu)}
                                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded"
                            >
                                <option.icon /> {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* URL Confirmation Dialog */}
            {pendingImageUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-2">Convert to Image?</h3>
                        <p className="text-gray-600 mb-4">
                            This looks like an image URL. Would you like to convert it to an image block?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setPendingImageUrl(null);
                                    setPasteIndex(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const newBlock = {
                                        id: uuidv4(),
                                        type: 'image',
                                        content: pendingImageUrl,
                                        properties: {}
                                    };
                                    const updatedBlocks = [
                                        ...blocks.slice(0, pasteIndex + 1),
                                        newBlock,
                                        ...blocks.slice(pasteIndex + 1)
                                    ];
                                    setBlocks(updatedBlocks);
                                    saveNote(updatedBlocks);
                                    setPendingImageUrl(null);
                                    setPasteIndex(null);
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Convert to Image
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showShareDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Share Note</h3>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 p-2 border rounded"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Copy
                            </button>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowShareDialog(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const NotePageWithProvider = ({ params }) => {
    return (
        <DragProvider>
            <NotePage params={params} />
        </DragProvider>
    );
};

export default NotePageWithProvider;