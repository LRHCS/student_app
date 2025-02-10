"use client";
import { useState, useRef, useEffect } from 'react';
import { supabase } from "@/app/utils/client";
import { MdBrush, MdOutlineColorize, MdOutlineFormatColorReset } from 'react-icons/md';
import { BsEraser } from 'react-icons/bs';

const DrawingLayer = ({ isActive, lessonId }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [drawings, setDrawings] = useState([]);
    const [context, setContext] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPoint = useRef(null);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(2);
    const [isLoading, setIsLoading] = useState(true);
    const [currentStroke, setCurrentStroke] = useState(null);
    const [tool, setTool] = useState('brush');
    const [eraserSize, setEraserSize] = useState(20);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        setContext(ctx);

        const updateCanvasSize = () => {
            const { width, height } = container.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawCanvas(drawings);
        };

        // Use requestAnimationFrame to ensure the canvas is updated after layout
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateCanvasSize);
        });

        resizeObserver.observe(container);
        updateCanvasSize(); // Initial size update

        return () => {
            resizeObserver.disconnect();
        };
    }, [drawings]);

    useEffect(() => {
        loadDrawings();
    }, [lessonId]);

    useEffect(() => {
        if (context && drawings.length > 0) {
            redrawCanvas(drawings);
        }
    }, [context]);

    useEffect(() => {
        if (isActive) {
            document.body.classList.add('drawing-active');
        } else {
            document.body.classList.remove('drawing-active');
        }

        return () => {
            document.body.classList.remove('drawing-active');
        };
    }, [isActive]);

    const loadDrawings = async () => {
        if (!lessonId) return;
        
        const { data, error } = await supabase
            .from('Lessons')
            .select('drawings')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error loading drawings:', error);
            return;
        }

        if (data?.drawings) {
            setDrawings(data.drawings);
            if (context) {
                redrawCanvas(data.drawings);
            }
        }
        setIsLoading(false);
    };

    const redrawCanvas = (drawingData) => {
        if (!context || !canvasRef.current) return;
        
        const dpr = window.devicePixelRatio || 1;
        context.clearRect(0, 0, canvasRef.current.width / dpr, canvasRef.current.height / dpr);
        
        drawingData.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return;

            context.beginPath();
            context.strokeStyle = stroke.color;
            context.lineWidth = stroke.brushSize;

            context.moveTo(stroke.points[0].x, stroke.points[0].y);
            
            for (let i = 1; i < stroke.points.length; i++) {
                context.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            context.stroke();
        });
    };

    const getPoint = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        return {
            x: (clientX - rect.left),
            y: (clientY - rect.top)
        };
    };

    const startDrawing = (e) => {
        if (!isActive) return;
        const point = getPoint(e);
        lastPoint.current = point;
        setIsDrawing(true);

        if (tool === 'eraser') {
            return;
        }

        setDrawings(prev => {
            const newDrawings = [...prev, { color, brushSize, points: [point] }];
            saveDrawings(newDrawings);
            return newDrawings;
        });
    };

    const draw = (e) => {
        if (!isDrawing || !isActive || !context || !lastPoint.current) return;

        const point = getPoint(e);
        
        if (tool === 'eraser') {
            const dpr = window.devicePixelRatio || 1;
            const eraserRadius = eraserSize * dpr;

            // Create new array of strokes
            const updatedDrawings = [];
            
            drawings.forEach(stroke => {
                if (!stroke.points || stroke.points.length < 2) return;

                let currentSegment = [];
                let isSegmentValid = true;

                // Check each point in the stroke
                stroke.points.forEach((p, index) => {
                    const dx = p.x - point.x;
                    const dy = p.y - point.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= eraserRadius) {
                        // Point is under eraser
                        if (currentSegment.length >= 2) {
                            // Save the current segment if it has enough points
                            updatedDrawings.push({
                                ...stroke,
                                points: [...currentSegment]
                            });
                        }
                        currentSegment = [];
                        isSegmentValid = false;
                    } else {
                        // Point is not under eraser
                        currentSegment.push(p);
                        
                        // If this is the last point and we have a valid segment
                        if (index === stroke.points.length - 1 && currentSegment.length >= 2) {
                            updatedDrawings.push({
                                ...stroke,
                                points: [...currentSegment]
                            });
                        }
                    }
                });
            });

            setDrawings(updatedDrawings);
            redrawCanvas(updatedDrawings);
            saveDrawings(updatedDrawings);
        } else {
            // Normal drawing functionality
            context.beginPath();
            context.strokeStyle = color;
            context.lineWidth = brushSize;
            context.moveTo(lastPoint.current.x, lastPoint.current.y);
            context.lineTo(point.x, point.y);
            context.stroke();
            
            const currentStroke = drawings[drawings.length - 1];
            currentStroke.points.push(point);
        }

        setDrawings([...drawings]);
        saveDrawings(drawings);
        lastPoint.current = point;
    };

    const saveDrawings = async (updatedDrawings) => {
        const { error } = await supabase
            .from('Lessons')
            .update({ drawings: updatedDrawings })
            .eq('id', lessonId);

        if (error) {
            console.error('Error saving drawings:', error);
        }
    };

    const stopDrawing = async () => {
        if (isDrawing && currentStroke && tool !== 'eraser') {
            const newDrawings = [...drawings, currentStroke];
            setDrawings(newDrawings);
            await saveDrawings(newDrawings);
        }
        
        setIsDrawing(false);
        lastPoint.current = null;
        setCurrentStroke(null);
    };

    const clearCanvas = async () => {
        if (!context || !canvasRef.current) return;
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setDrawings([]);
        
        const { error } = await supabase
            .from('Lessons')
            .update({ drawings: [] })
            .eq('id', lessonId);

        if (error) {
            console.error('Error clearing drawings:', error);
        }
    };

    return (
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full pointer-events-auto z-50">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
            />
            {isActive && (
                <div className="fixed top-20 right-4 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg z-50 pointer-events-auto">
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setTool('brush')}
                            className={`p-2 rounded ${tool === 'brush' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            title="Brush tool"
                        >
                            <MdBrush />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            title="Eraser tool"
                        >
                            <BsEraser />
                        </button>
                    </div>
                    
                    {tool === 'brush' ? (
                        <div className="flex flex-col gap-2">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-8 h-8 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                                <MdOutlineColorize className="text-gray-500" />
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-24"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <BsEraser className="text-gray-500" />
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={eraserSize}
                                onChange={(e) => setEraserSize(parseInt(e.target.value))}
                                className="w-24"
                            />
                        </div>
                    )}
                    
                    <button
                        onClick={clearCanvas}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                    >
                        <MdOutlineFormatColorReset />
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default DrawingLayer; 