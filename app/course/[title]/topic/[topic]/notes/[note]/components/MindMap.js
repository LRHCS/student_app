"use client";
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../../../../../../../utils/supabase/client';

const Node = ({ node, onDragStart, onDragEnd, onDrag, selected, onClick, onDoubleClick, onConnectionStart, onConnectionEnd, isConnecting, panOffset, onDelete }) => {
    const nodeRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseDown = (e) => {
        // Prevent event bubbling to container when clicking on nodes
        e.stopPropagation();
        
        if (node.isCenter) return; // Prevent dragging center node
        
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
                ${node.isCenter ? 'cursor-default' : 'cursor-pointer'} border-2 
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
                zIndex: node.isCenter ? 1 : 0,
                position: 'absolute'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={node.isCenter ? null : handleMouseDown}
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
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                node.onEditComplete?.();
                            }
                        }}
                        className="w-full text-center border-b border-gray-300 focus:outline-none focus:border-blue-500"
                        autoFocus
                    />
                ) : (
                    <span className="select-none">{node.label}</span>
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

const MindMap = ({ lessonId, title }, ref) => {
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
    const [centerPosition, setCenterPosition] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

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

    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCenterPosition({
                x: rect.width / 2,
                y: rect.height / 2
            });
        }
    }, []);

    useEffect(() => {
        if (nodes.length > 0) {
            const updatedNodes = nodes.map(node => 
                node.isCenter ? { ...node, label: title } : node
            );
            setNodes(updatedNodes);
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

        if (data?.mindmap?.nodes?.length > 0) {
            // Keep center node at (0,0) relative position
            const updatedNodes = data.mindmap.nodes.map((node, index) => {
                if (index === 0) {
                    return {
                        ...node,
                        position: { x: 0, y: 0 },
                        isCenter: true,
                        label: title
                    };
                }
                return node;
            });
            setNodes(updatedNodes);
            setConnections(data.mindmap.connections || []);
        } else {
            const centerNode = {
                id: '1',
                label: title,
                position: { x: 0, y: 0 },
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
        const node = nodes.find(n => n.id === nodeId);
        if (node?.isCenter) return; // Prevent dragging center node

        const containerRect = containerRef.current.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        // Convert to relative position
        const relativeX = x - centerX;
        const relativeY = y - centerY;

        setNodes(nodes.map(node =>
            node.id === nodeId ? { ...node, position: { x: relativeX, y: relativeY } } : node
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
            position: { x: newX, y: newY },
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

    // Function to calculate relative position from center
    const getRelativePosition = (node) => {
        if (!node.position) return { x: 0, y: 0 };
        return {
            x: node.position.x - centerPosition.x,
            y: node.position.y - centerPosition.y
        };
    };

    // Function to calculate absolute position from relative
    const getAbsolutePosition = (node) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // For center node, always return center position
        if (node.isCenter) {
            return { x: centerX, y: centerY };
        }

        return {
            x: (node.position?.x || 0) + centerX,
            y: (node.position?.y || 0) + centerY
        };
    };

    // Add wheel handler for zooming
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheelEvent = (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            setScale(prevScale => {
                const newScale = delta > 0 
                    ? Math.max(0.5, prevScale - 0.1)
                    : Math.min(2, prevScale + 0.1);
                return newScale;
            });
        };

        container.addEventListener('wheel', handleWheelEvent, { passive: false });
        return () => container.removeEventListener('wheel', handleWheelEvent);
    }, []);

    // Add keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedNode) {
                switch (e.key) {
                    case 'Tab':
                        e.preventDefault();
                        const parentNode = nodes.find(n => n.id === selectedNode);
                        if (parentNode) {
                            const parentPos = getAbsolutePosition(parentNode);
                            const newNode = {
                                id: Date.now().toString(),
                                label: 'New Node',
                                position: {
                                    x: (parentPos.x - centerPosition.x) + 150,
                                    y: (parentPos.y - centerPosition.y) + 50
                                }
                            };
                            const newNodes = [...nodes, newNode];
                            const newConnection = {
                                id: Date.now().toString(),
                                start: selectedNode,
                                end: newNode.id
                            };
                            setNodes(newNodes);
                            setConnections([...connections, newConnection]);
                            setSelectedNode(newNode.id);
                            saveMindMap(newNodes, [...connections, newConnection]);
                        }
                        break;
                    case ' ': // Space key
                        e.preventDefault();
                        setNodes(nodes.map(node =>
                            node.id === selectedNode ? { ...node, isEditing: true } : node
                        ));
                        break;
                    case 'Enter':
                        if (nodes.find(n => n.id === selectedNode)?.isEditing) {
                            e.preventDefault();
                            handleEditComplete(selectedNode);
                        }
                        break;
                    case 'Backspace':
                        if (!nodes.find(n => n.id === selectedNode)?.isEditing) {
                            e.preventDefault();
                            deleteNode(selectedNode);
                        }
                        break;
                    case 'ArrowLeft':
                    case 'ArrowRight':
                    case 'ArrowUp':
                    case 'ArrowDown':
                        e.preventDefault();
                        navigateNodes(e.key);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNode, nodes, connections]);

    // Add navigation function
    const navigateNodes = (direction) => {
        const currentNode = nodes.find(n => n.id === selectedNode);
        if (!currentNode) return;

        const currentPos = getAbsolutePosition(currentNode);
        let closestNode = null;
        let closestDistance = Infinity;

        nodes.forEach(node => {
            if (node.id === selectedNode) return;
            const nodePos = getAbsolutePosition(node);
            const dx = nodePos.x - currentPos.x;
            const dy = nodePos.y - currentPos.y;

            // Check if node is in the correct direction
            const isCorrectDirection = 
                (direction === 'ArrowLeft' && dx < 0) ||
                (direction === 'ArrowRight' && dx > 0) ||
                (direction === 'ArrowUp' && dy < 0) ||
                (direction === 'ArrowDown' && dy > 0);

            if (isCorrectDirection) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNode = node;
                }
            }
        });

        if (closestNode) {
            setSelectedNode(closestNode.id);
        }
    };

    // Add this function to handle panning
    const handlePan = (e) => {
        if (isPanning && panStart) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            setPanOffset({
                x: panStart.offset.x + dx,
                y: panStart.offset.y + dy
            });
        }
    };

    



    // Add a prop to expose the center function
    useImperativeHandle(ref, () => ({
        centerMindMap
    }));

    return (
        <div 
            ref={containerRef} 
            className="relative w-full h-full bg-gray-50 overflow-hidden"
            onMouseDown={(e) => {
                // Change to left mouse button (button 0)
                if (e.button === 0) {
                    e.preventDefault();
                    setIsPanning(true);
                    setPanStart({ 
                        x: e.clientX, 
                        y: e.clientY, 
                        offset: { ...panOffset } 
                    });
                    document.body.style.cursor = 'grabbing';
                }
            }}
            onMouseMove={(e) => {
                handlePan(e);
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
                    document.body.style.cursor = 'default';
                }
            }}
            onMouseLeave={() => {
                if (isPanning) {
                    setIsPanning(false);
                    setPanStart(null);
                    document.body.style.cursor = 'default';
                }
            }}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
            <div style={{
                transform: `scale(${scale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'center',
                width: '100%',
                height: '100%',
                position: 'relative',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}>
                {connections.map(connection => {
                    const startNode = nodes.find(n => n.id === connection.start);
                    const endNode = nodes.find(n => n.id === connection.end);
                    if (!startNode || !endNode) return null;

                    const startPos = getAbsolutePosition(startNode);
                    const endPos = getAbsolutePosition(endNode);

                    return (
                        <Connection
                            key={connection.id}
                            start={{ ...startNode, x: startPos.x, y: startPos.y }}
                            end={{ ...endNode, x: endPos.x, y: endPos.y }}
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
                    const absPos = getAbsolutePosition(node);
                    return (
                        <Node
                            key={node.id}
                            node={{
                                ...node,
                                x: absPos.x,
                                y: absPos.y,
                                label: node.isCenter ? title : node.label,
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
                        />
                    );
                })}
            </div>
            
        </div>
    );
};

export default MindMap; 