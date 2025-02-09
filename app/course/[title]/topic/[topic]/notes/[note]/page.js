"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import { supabase } from "@/app/utils/client";
import { FaPlus } from 'react-icons/fa';
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
    MdEdit
} from 'react-icons/md';
import BlockRenderer from './BlockRenderer';
import DrawingLayer from '@/app/components/DrawingLayer';

// Dynamically import CodeMirror to avoid SSR issues
const CodeMirror = dynamic(
    () => import('@uiw/react-codemirror').then(mod => mod.default),
    { ssr: false }
);

// First, remove the existing dynamic imports for drag and drop components
// and replace them with this new implementation:

const DragDropContextWrapper = dynamic(
    () => import('react-beautiful-dnd').then(mod => {
        const { DragDropContext } = mod;
        return function DragDropContextComponent({ children, ...props }) {
            return <DragDropContext {...props}>{children}</DragDropContext>;
        };
    }),
    { ssr: false }
);

const DroppableWrapper = dynamic(
    () => import('react-beautiful-dnd').then(mod => {
        const { Droppable } = mod;
        return function DroppableComponent({ children, ...props }) {
            return (
                <Droppable 
                    {...props} 
                    isDropDisabled={false}
                    isCombineEnabled={false}
                    ignoreContainerClipping={false}
                    renderClone={null}
                >
                    {children}
                </Droppable>
            );
        };
    }),
    { ssr: false }
);

const DraggableWrapper = dynamic(
    () => import('react-beautiful-dnd').then(mod => {
        const { Draggable } = mod;
        return function DraggableComponent({ children, draggableId, index }) {
            return (
                <Draggable 
                    draggableId={draggableId}
                    index={index}
                >
                    {(provided, snapshot) => {
                        return (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                data-block-index={index}
                                className={`group relative mb-2 ${
                                    snapshot.isDragging ? 'opacity-50' : ''
                                }`}
                            >
                                {children(provided, snapshot)}
                            </div>
                        );
                    }}
                </Draggable>
            );
        };
    }),
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
    EMBED: 'embed'
};

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
    { type: 'table', icon: MdOutlineTableChart , label: 'Table' },
    { type: 'callout', icon: MdInfo, label: 'Callout' },
    { type: 'divider', icon: MdHorizontalRule, label: 'Divider' },
    { type: 'image', icon: MdImage, label: 'Image' },
    { type: 'embed', icon: MdVideoLibrary, label: 'Embed' },
    { type: 'link', icon: MdLink, label: 'Link' },
];

export default function NotePage({ params }) {
    const pathname = usePathname();
    const [blocks, setBlocks] = useState([]);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [title, setTitle] = useState("");
    const [isDrawingMode, setIsDrawingMode] = useState(false);

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

    const fetchNote = async () => {
        if (!lessonId) return;

        const { data, error } = await supabase
            .from('Lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching lesson:', error.message);
            setBlocks([createDefaultBlock()]);
        } else if (data) {
            try {
                const parsedContent = JSON.parse(data.content || '[]');
                const validBlocks = parsedContent.map(block => ({
                    ...block,
                    id: String(block.id)
                }));
                setBlocks(validBlocks.length ? validBlocks : [createDefaultBlock()]);
            } catch (e) {
                console.error('Error parsing content:', e);
                setBlocks([createDefaultBlock()]);
            }
        }
    };

    const createDefaultBlock = () => ({
        id: String(uuidv4()),
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
            id: String(uuidv4()),
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

    const removeBlock = (index) => {
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

    const handleEnterPress = (index, newBlockData = null) => {
        const newBlock = {
            id: String(uuidv4()),
            ...(newBlockData || createDefaultBlock()),
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
        if (index === 0) return;

        const updatedBlocks = blocks.filter((_, i) => i !== index);
        const previousBlock = updatedBlocks[index - 1];
        const currentBlock = blocks[index];

        // Merge content with previous block if applicable
        if (previousBlock && currentBlock) {
            previousBlock.content += currentBlock.content;
        }

        setBlocks(updatedBlocks);
        saveNote(updatedBlocks);
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

    return (
        <div className="min-h-screen flex flex-col bg-white">
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
                    <button
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        className={`p-2 rounded-full ${isDrawingMode ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                        title="Toggle drawing mode"
                    >
                        <MdEdit className="text-xl" />
                    </button>
                </div>
            </div>

            <div className="relative flex-grow">
                {isDrawingMode && <DrawingLayer isActive={isDrawingMode} lessonId={lessonId} />}

                <div className="relative z-30">
                    <DragDropContextWrapper onDragEnd={handleDragEnd}>
                        <DroppableWrapper 
                            droppableId="blocks"
                            type="DEFAULT"
                            direction="vertical"
                        >
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-grow p-4 max-w-4xl mx-auto w-full ${
                                        snapshot.isDraggingOver ? 'bg-gray-50' : ''
                                    }`}
                                >
                                    <div className="min-h-[75vh] relative">
                                        {blocks.map((block, index) => {
                                            const blockId = String(block.id);
                                            const isLastBlock = index === blocks.length - 1;
                                            return (
                                                <DraggableWrapper
                                                    key={blockId}
                                                    draggableId={blockId}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <>
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-move p-2"
                                                            >
                                                                <MdDragIndicator />
                                                            </div>
                                                            <BlockRenderer
                                                                block={block}
                                                                onChange={(content, properties) => 
                                                                    handleBlockChange(blockId, content, properties)
                                                                }
                                                                onRemove={() => removeBlock(index)}
                                                                onEnterPress={handleEnterPress}
                                                                onBackspacePress={handleBackspacePress}
                                                                onSlashCommand={handleSlashCommand}
                                                                onTransformBlock={transformBlock}
                                                                index={index}
                                                                isLastBlock={isLastBlock}
                                                                onFocusNext={focusNextBlock}
                                                                onFocusPrevious={focusPreviousBlock}
                                                            />
                                                            {isLastBlock && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        const rect = e.target.getBoundingClientRect();
                                                                        setMenuPosition({
                                                                            x: rect.left,
                                                                            y: rect.bottom + window.scrollY
                                                                        });
                                                                        setShowBlockMenu(index);
                                                                    }}
                                                                    className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-full p-1"
                                                                >
                                                                    <FaPlus />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </DraggableWrapper>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                    <div className="h-[25vh]" />
                                </div>
                            )}
                        </DroppableWrapper>
                    </DragDropContextWrapper>
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
        </div>
    );
}