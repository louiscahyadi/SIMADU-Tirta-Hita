"use client";

import React from "react";

interface LoadingSkeletonProps {
  type?: "list" | "card" | "table" | "form";
  rows?: number;
  className?: string;
}

export default function LoadingSkeleton({
  type = "list",
  rows = 5,
  className = "",
}: LoadingSkeletonProps) {
  const skeletonAnimation = "animate-pulse bg-gray-200 rounded";

  if (type === "list") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className={`${skeletonAnimation} h-12 w-12 rounded-full`}></div>
            <div className="flex-1 space-y-2">
              <div className={`${skeletonAnimation} h-4 w-3/4`}></div>
              <div className={`${skeletonAnimation} h-3 w-1/2`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className={`${skeletonAnimation} h-6 w-2/3 mb-3`}></div>
            <div className="space-y-2">
              <div className={`${skeletonAnimation} h-4 w-full`}></div>
              <div className={`${skeletonAnimation} h-4 w-5/6`}></div>
              <div className={`${skeletonAnimation} h-4 w-4/6`}></div>
            </div>
            <div className="flex justify-between mt-4">
              <div className={`${skeletonAnimation} h-8 w-24`}></div>
              <div className={`${skeletonAnimation} h-8 w-24`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`overflow-hidden ${className}`}>
        <div className="border border-gray-200 rounded-lg">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex space-x-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={`${skeletonAnimation} h-4 flex-1`}></div>
              ))}
            </div>
          </div>
          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="border-b border-gray-200 p-4 last:border-b-0">
              <div className="flex space-x-4">
                {Array.from({ length: 4 }).map((_, colIndex) => (
                  <div key={colIndex} className={`${skeletonAnimation} h-4 flex-1`}></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className={`${skeletonAnimation} h-4 w-1/4`}></div>
            <div className={`${skeletonAnimation} h-10 w-full rounded-md`}></div>
          </div>
        ))}
        <div className={`${skeletonAnimation} h-10 w-32 rounded-md mt-6`}></div>
      </div>
    );
  }

  return null;
}

// Additional specialized skeleton components
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <LoadingSkeleton type="table" rows={rows} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return <LoadingSkeleton type="card" rows={rows} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return <LoadingSkeleton type="list" rows={rows} />;
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return <LoadingSkeleton type="form" rows={fields} />;
}
