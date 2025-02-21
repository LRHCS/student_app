import React from "react";
import { useDragLayer } from "react-dnd";

const layerStyles = {
  position: "fixed",
  pointerEvents: "none",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 9999,
};

function getItemStyles(initialOffset, currentOffset) {
  if (!initialOffset || !currentOffset) {
    return { display: "none" };
  }

  const { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

// This preview renders a static version of the card (without drag logic)
const KanbanCardPreview = ({ task }) => {
  const examUrl = task.type === "exam" ? `/exam/${task.id}` : "#";
  const dueDate = task.date ? new Date(task.date) : null;
  return (
    <div className="bg-white p-4 rounded shadow mb-2">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {task.type === "exam" ? (
            <a
              href={examUrl}
              className="text-lg font-semibold text-blue-600 hover:text-blue-800"
            >
              {task.title || "Untitled Exam"}
            </a>
          ) : (
            <div className="font-semibold">
              {task.title || "Untitled Assignment"}
            </div>
          )}
          {dueDate && (
            <div className="text-xs md:text-sm text-gray-500">
              Due: {dueDate.toLocaleDateString()}
            </div>
          )}
          {(task.topic_name || task.course_name) && (
            <div className="text-xs md:text-sm text-gray-600 mt-1">
              {task.course_name && <span>{task.course_name}</span>}
              {task.topic_name && (
                <>
                  {task.course_name && <span> - </span>}
                  <span>{task.topic_name}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomDragLayer = () => {
  const { item, initialOffset, currentOffset, isDragging } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    })
  );

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        <KanbanCardPreview task={item} />
      </div>
    </div>
  );
};

export default CustomDragLayer; 