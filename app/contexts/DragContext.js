"use client";
import { createContext, useContext, useState } from 'react';

const DragContext = createContext();

export function DragProvider({ children }) {
    const [draggedBlock, setDraggedBlock] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const [dropPosition, setDropPosition] = useState(null);

    const value = {
        draggedBlock,
        setDraggedBlock,
        draggedIndex,
        setDraggedIndex,
        dropTarget,
        setDropTarget,
        dropPosition,
        setDropPosition
    };

    return (
        <DragContext.Provider value={value}>
            {children}
        </DragContext.Provider>
    );
}

export function useDrag() {
    const context = useContext(DragContext);
    if (!context) {
        throw new Error('useDrag must be used within a DragProvider');
    }
    return context;
} 