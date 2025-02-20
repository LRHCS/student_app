"use client";
import React from "react";

export default function LoadingCard({ className = "" }) {
  return (
    <div className={`border border-gray-300 rounded-lg p-4 animate-pulse ${className}`}>
      {/* Animated loading line */}
      <div className="relative h-4 bg-gray-300 rounded w-3/4 mb-4 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 animate-loadingLine" />
      </div>
      {/* A shorter placeholder line */}
      <div className="h-4 bg-gray-300 rounded w-1/2" />
    </div>
  );
} 