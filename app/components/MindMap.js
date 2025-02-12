"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/client';

const Node = ({ node, onDragStart, onDragEnd, onDrag, selected, onClick, onDoubleClick, onConnectionStart, onConnectionEnd, isConnecting, panOffset, onDelete }) => {
    const nodeRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseDown = (e) => {
        if (e.button === 2) {
            e.preventDefault();
            onConnectionStart?.(node.id, node.x, node.y);
            return;
        }

        if (node.isCenter) return; // Prevent dragging on center node with left-click
        
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
            id={`node-${node.id}`}
            ref={nodeRef}
            className={`absolute p-4 bg-white rounded-lg shadow-lg z-0
                ${node.isCenter ? 'cursor-default' : 'cursor-move'} border-2 
                ${selected ? 'border-blue-500' : 'border-gray-200'} 
                ${isDragging ? 'opacity-75' : ''}
                ${isConnecting ? 'cursor-crosshair' : ''}`}
            style={{
                left: node.x + (panOffset?.x || 0),
                top: node.y + (panOffset?.y || 0),
                transform: 'translate(-50%, -50%)',
                minWidth: '120px',
                backgroundColor: node.isCenter ? 'black' : 'white',
                color: node.isCenter ? 'white' : 'black',
                height: node.isCenter ? '100px' : '',
                width: node.isCenter ? '200px' : '50px',
                fontSize: node.isCenter ? '20px' : '16px',
                display: node.isCenter ? 'flex' : 'block',
                alignItems: node.isCenter ? 'center' : 'flex-start',
                justifyContent: node.isCenter ? 'center' : 'flex-start',
                zIndex: 0
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
            {isHovered && !node.isCenter && (
                <button
                    className="absolute top-1 right-1 bg-transparent border-0 text-red-500 text-lg font-bold cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                    }}
                >
                    ×
                </button>
            )}
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
    // Adjust the end point so that the arrow stops at the edge of an elliptical node.
    let adjustedEnd = end;
    if (end && end.id) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);

        // Define horizontal and vertical radii for the ellipse.
        const a = end.isCenter ? 100 : 60; // horizontal radius: 100 if center node, else 60
        const b = end.isCenter ? 50 : 40;  // vertical radius: 50 if center node, else 40

        // Solve for t in: (t*cos(angle))^2/(a^2) + (t*sin(angle))^2/(b^2) = 1
        let t = 1 / Math.sqrt((Math.pow(Math.cos(angle), 2) / (a * a)) + (Math.pow(Math.sin(angle), 2) / (b * b)));
        // For the center node, increase the offset slightly so the arrow lands further out
        if (end.isCenter) {
            t = t * 1.15; // increase factor as needed for a better fit
        }

        adjustedEnd = {
            x: end.x - Math.cos(angle) * t,
            y: end.y - Math.sin(angle) * t,
        };
    }

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="10"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={isTemp ? "#93C5FD" : "#000000"}
                    />
                </marker>
            </defs>
            <line
                x1={start.x + (panOffset?.x || 0)}
                y1={start.y + (panOffset?.y || 0)}
                x2={adjustedEnd.x + (panOffset?.x || 0)}
                y2={adjustedEnd.y + (panOffset?.y || 0)}
                stroke={isTemp ? "#000000" : "#000000"}
                strokeWidth="2"
                strokeDasharray={isTemp ? "5,5" : "none"}
                markerEnd="url(#arrowhead)"
            />
        </svg>
    );
};

const MindMap = ({ lessonId, title }) => {
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

    useEffect(() => {
        if (nodes.length > 0 && nodes[0].isCenter) {
            const updatedNodes = [{ ...nodes[0], label: title }, ...nodes.slice(1)];
            setNodes(updatedNodes);
            // Optionally, persist the update to the backend:
            // saveMindMap(updatedNodes, connections);
        }
    }, [title]);

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

        if (data?.mindmap?.nodes?.length > 0) {
            // Ensure the first node is the center node with the passed title
            const updatedNodes = data.mindmap.nodes.map((node, index) => 
                index === 0 ? { ...node, isCenter: true, x: centerX, y: centerY, label: title } : node
            );
            setNodes(updatedNodes);
            setConnections(data.mindmap.connections || []);
        } else {
            const centerNode = {
                id: '1',
                label: title,
                x: centerX,
                y: centerY,
                isCenter: true,
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
        const nodeElement = document.getElementById(`node-${nodeId}`);
        const nodeRect = nodeElement.getBoundingClientRect();
        const halfNodeWidth = nodeRect.width / 2;
        const halfNodeHeight = nodeRect.height / 2;
        
        // Constrain x and y to keep the node fully within the container
        const relativeX = Math.max(halfNodeWidth, Math.min(x, containerRect.width - halfNodeWidth));
        const relativeY = Math.max(halfNodeHeight, Math.min(y, containerRect.height - halfNodeHeight));

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

    const deleteNode = (nodeId) => {
        const updatedNodes = nodes.filter(node => node.id !== nodeId);
        const updatedConnections = connections.filter(
            conn => conn.start !== nodeId && conn.end !== nodeId
        );
        
        setNodes(updatedNodes);
        setConnections(updatedConnections);
        saveMindMap(updatedNodes, updatedConnections);
        
        if (selectedNode === nodeId) {
            setSelectedNode(null);
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

            {nodes.map(node => {
                // Always override the label for the center node with the passed title
                const displayNode = node.isCenter ? { ...node, label: title } : node;
                return (
                    <Node
                        key={node.id}
                        node={{
                            ...displayNode,
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
                        onDelete={() => deleteNode(node.id)}
                        className="z-0"
                    />
                );
            })}

            <div className="absolute bottom-4 right-4 flex gap-2 z-50">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        addNode();
                    }}
                    className="border w-full border-gray-300 px-4 py-2 text-sm rounded-lg shadow-lg hover:border-gray-600 absolute bottom-14 right-4" 
                >
                    Add Node
                </button>
            </div>
        </div>
    );
};

export default MindMap; 