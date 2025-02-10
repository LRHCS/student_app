"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/client';

const Node = ({ node, onDragStart, onDragEnd, onDrag, selected, onClick, onDoubleClick, onConnectionStart, onConnectionEnd, isConnecting, panOffset }) => {
    const nodeRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.button === 2) {
            e.preventDefault();
            onConnectionStart?.(node.id, node.x, node.y);
            return;
        }

        if (nodeRef.current) {
            const rect = nodeRef.current.getBoundingClientRect();
            const containerRect = nodeRef.current.parentElement.getBoundingClientRect();
            
            setDragOffset({
                x: e.clientX - ((node.x + (panOffset?.x || 0)) - containerRect.left),
                y: e.clientY - ((node.y + (panOffset?.y || 0)) - containerRect.top)
            });
        }
        setIsDragging(true);
        onDragStart?.(node.id);
    };

    const handleMouseMove = (e) => {
        if (isDragging && nodeRef.current) {
            const containerRect = nodeRef.current.parentElement.getBoundingClientRect();
            const computedX = e.clientX - dragOffset.x + containerRect.left;
            const computedY = e.clientY - dragOffset.y + containerRect.top;
            onDrag?.(node.id, computedX - (panOffset?.x || 0), computedY - (panOffset?.y || 0));
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            onDragEnd?.(node.id);
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    return (
        <div
            ref={nodeRef}
            className={`absolute p-4 bg-white rounded-lg shadow-lg cursor-move border-2 
                ${selected ? 'border-blue-500' : 'border-gray-200'} 
                ${isDragging ? 'opacity-75' : ''}
                ${isConnecting ? 'cursor-crosshair' : ''}`}
            style={{
                left: node.x + (panOffset?.x || 0),
                top: node.y + (panOffset?.y || 0),
                transform: 'translate(-50%, -50%)',
                minWidth: '120px',
                zIndex: isDragging ? 1000 : 1
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
                e.stopPropagation();
                if (isConnecting) {
                    onConnectionEnd?.(node.id);
                } else {
                    onClick?.(node.id);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick?.(node.id);
            }}
        >
            <div className="text-center">
                {node.isEditing ? (
                    <input
                        type="text"
                        value={node.label}
                        onChange={(e) => node.onLabelChange?.(e.target.value)}
                        onBlur={() => node.onEditComplete?.()}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') node.onEditComplete?.();
                        }}
                        className="w-full text-center border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                ) : (
                    <span>{node.label}</span>
                )}
            </div>
        </div>
    );
};

const Connection = ({ start, end, isTemp = false, panOffset }) => {
    return (
        <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        >
            <line
                x1={start.x + (panOffset?.x || 0)}
                y1={start.y + (panOffset?.y || 0)}
                x2={end.x + (panOffset?.x || 0)}
                y2={end.y + (panOffset?.y || 0)}
                stroke={isTemp ? "#93C5FD" : "#CBD5E0"}
                strokeWidth="2"
                strokeDasharray={isTemp ? "5,5" : "none"}
            />
        </svg>
    );
};

const MindMap = ({ lessonId }) => {
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const containerRef = useRef(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStart, setConnectionStart] = useState(null);
    const [tempConnection, setTempConnection] = useState(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState(null);

    useEffect(() => {
        loadMindMap();
    }, [lessonId]);

    const loadMindMap = async () => {
        if (!lessonId || !containerRef.current) return;

        const { data, error } = await supabase
            .from('Lessons')
            .select('mindmap')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error loading mindmap:', error);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;

        if (data?.mindmap) {
            setNodes(data.mindmap.nodes || []);
            setConnections(data.mindmap.connections || []);
        } else {
            const centerNode = {
                id: '1',
                label: 'Main Topic',
                x: centerX,
                y: centerY,
            };
            setNodes([centerNode]);
            saveMindMap([centerNode], []);
        }
    };

    const saveMindMap = async (updatedNodes, updatedConnections) => {
        const { error } = await supabase
            .from('Lessons')
            .update({
                mindmap: {
                    nodes: updatedNodes,
                    connections: updatedConnections,
                },
            })
            .eq('id', lessonId);

        if (error) {
            console.error('Error saving mindmap:', error);
        }
    };

    const handleNodeDrag = (nodeId, x, y) => {
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const relativeX = Math.max(0, Math.min(x, containerRect.width));
        const relativeY = Math.max(0, Math.min(y, containerRect.height));

        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, x: relativeX, y: relativeY } : node
        ));
    };

    const handleNodeDragEnd = () => {
        saveMindMap(nodes, connections);
    };

    const addNode = (x, y) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = (typeof x === 'number') ? x : containerRect.width / 2;
        const newY = (typeof y === 'number') ? y : containerRect.height / 2;

        const newNode = {
            id: Date.now().toString(),
            label: 'New Node',
            x: newX,
            y: newY,
        };

        const newNodes = [...nodes, newNode];
        setNodes(newNodes);

        if (selectedNode) {
            const newConnection = {
                id: Date.now().toString(),
                start: selectedNode,
                end: newNode.id,
            };
            const newConnections = [...connections, newConnection];
            setConnections(newConnections);
            saveMindMap(newNodes, newConnections);
        } else {
            saveMindMap(newNodes, connections);
        }
    };

    const handleNodeClick = (nodeId) => {
        setSelectedNode(nodeId);
    };

    const handleNodeDoubleClick = (nodeId) => {
        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, isEditing: true } : node
        ));
    };

    const handleLabelChange = (nodeId, newLabel) => {
        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, label: newLabel } : node
        ));
    };

    const handleEditComplete = (nodeId) => {
        const updatedNodes = nodes.map(node =>
            node.id === nodeId ? { ...node, isEditing: false } : node
        );
        setNodes(updatedNodes);
        saveMindMap(updatedNodes, connections);
    };

    const handleConnectionStart = (nodeId, x, y) => {
        setIsConnecting(true);
        setConnectionStart({ id: nodeId, x, y });
    };

    const handleConnectionEnd = (endNodeId) => {
        if (isConnecting && connectionStart && connectionStart.id !== endNodeId) {
            const newConnection = {
                id: Date.now().toString(),
                start: connectionStart.id,
                end: endNodeId,
            };
            const newConnections = [...connections, newConnection];
            setConnections(newConnections);
            saveMindMap(nodes, newConnections);
        }
        setIsConnecting(false);
        setConnectionStart(null);
        setTempConnection(null);
    };

    const handleMouseMove = (e) => {
        if (isConnecting && connectionStart) {
            const rect = containerRef.current.getBoundingClientRect();
            setTempConnection({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    useEffect(() => {
        const handleResize = () => {
            loadMindMap();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div 
            ref={containerRef}
            className="absolute inset-0 bg-gray-50"
            onClick={() => {
                setSelectedNode(null);
                if (isConnecting) {
                    setIsConnecting(false);
                    setConnectionStart(null);
                    setTempConnection(null);
                }
            }}
            onMouseDown={(e) => {
                if (e.target === containerRef.current) {
                    setIsPanning(true);
                    setPanStart({ x: e.clientX, y: e.clientY, offset: { ...panOffset } });
                }
            }}
            onMouseMove={(e) => {
                if (isPanning && panStart) {
                    const dx = e.clientX - panStart.x;
                    const dy = e.clientY - panStart.y;
                    setPanOffset({ x: panStart.offset.x + dx, y: panStart.offset.y + dy });
                    return;
                }
                if (isConnecting && connectionStart) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setTempConnection({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    });
                }
            }}
            onMouseUp={() => {
                if (isPanning) {
                    setIsPanning(false);
                    setPanStart(null);
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;
                    addNode(clickX - panOffset.x, clickY - panOffset.y);
                }
            }}
        >
            {connections.map(connection => {
                const startNode = nodes.find(n => n.id === connection.start);
                const endNode = nodes.find(n => n.id === connection.end);
                if (!startNode || !endNode) return null;

                return (
                    <Connection
                        key={connection.id}
                        start={startNode}
                        end={endNode}
                        panOffset={panOffset}
                    />
                );
            })}

            {isConnecting && connectionStart && tempConnection && (
                <Connection
                    start={connectionStart}
                    end={tempConnection}
                    isTemp={true}
                    panOffset={panOffset}
                />
            )}

            {nodes.map(node => (
                <Node
                    key={node.id}
                    node={{
                        ...node,
                        onLabelChange: (label) => handleLabelChange(node.id, label),
                        onEditComplete: () => handleEditComplete(node.id),
                    }}
                    selected={selectedNode === node.id}
                    onDrag={handleNodeDrag}
                    onDragEnd={handleNodeDragEnd}
                    onClick={handleNodeClick}
                    onDoubleClick={handleNodeDoubleClick}
                    onConnectionStart={handleConnectionStart}
                    onConnectionEnd={handleConnectionEnd}
                    isConnecting={isConnecting}
                    panOffset={panOffset}
                />
            ))}

            <div className="absolute bottom-4 right-4 flex gap-2 z-50">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        addNode();
                    }}
                    className="border border-gray-300 px-4 py-2 text-sm rounded-lg shadow-lg hover:border-gray-600 absolute bottom-14 right-4" 
                >
                    Add Node
                </button>
            </div>
        </div>
    );
};

export default MindMap; 