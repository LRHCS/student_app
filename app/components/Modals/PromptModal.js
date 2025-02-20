"use client";

import { useState } from "react";

export default function PromptModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  initialValue = "", 
  placeholder = "" 
}) {
  const [value, setValue] = useState(initialValue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-[90vw]">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        {message && <p className="text-gray-600 mb-4">{message}</p>}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setValue(initialValue);
              onClose();
            }}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(value);
              setValue(initialValue);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 