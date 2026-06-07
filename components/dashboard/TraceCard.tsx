"use client";

import React, { useRef } from "react";
import { CornerUpRight, Copy, Check, Trash2 } from "lucide-react";

interface TraceCardProps {
  title: string;
  link: string;
  date: string;
  isRecent?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
  onShare?: () => void;
  onClick?: () => void;
}

const TraceCard = ({
  title,
  link,
  date,
  isRecent = false,
  isSelectMode = false,
  isSelected = false,
  onSelectToggle,
  onDelete,
  onLongPress,
  onShare,
  onClick,
}: TraceCardProps) => {
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile Long Press Gestures
  const handleTouchStart = () => {
    if (isRecent || isSelectMode) return;
    touchTimerRef.current = setTimeout(() => {
      onLongPress?.();
    }, 600); // 600ms threshold for long press
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      onSelectToggle?.();
    } else {
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd} // Cancel on scroll
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isSelectMode) {
            onSelectToggle?.();
          } else {
            onClick?.();
          }
        }
      }}
      className={`group w-full flex items-center justify-between p-5 rounded-[24px] border border-black/[0.05] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 select-none
        ${isRecent ? "bg-[#efefec]" : "bg-white"}
        ${isSelected ? "ring-2 ring-black bg-neutral-50/50 border-black/20" : ""}
        hover:border-black/10 active:scale-[0.99]`}
    >
      <div className="flex items-center min-w-0 flex-1">
        {/* Selection Checkbox */}
        {isSelectMode && !isRecent && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectToggle?.();
            }}
            className="mr-4 flex items-center justify-center shrink-0 animate-fade-in"
          >
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-black border-black text-white"
                  : "bg-white border-black/20 text-transparent"
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3.5] relative top-[0.5px]" />
            </div>
          </div>
        )}

        <div className="min-w-0 text-left flex-1">
          <h3 className="text-[15px] font-semibold text-black tracking-tight leading-snug">
            {title}
          </h3>

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[13px] text-black/50 truncate max-w-[120px] sm:max-w-[200px] font-medium leading-none">
                {link}
              </span>
              {!isSelectMode && (
                <button
                  title="Copy link"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(link);
                  }}
                  className="text-black/30 hover:text-black transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-[13px] text-black/20 shrink-0 font-medium leading-none">
              {date}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        {/* Individual desktop hover delete / mobile action button */}
        {!isRecent && !isSelectMode && (
          <button
            title="Delete trace"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="w-10 h-10 rounded-full hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all text-black/30 opacity-0 group-hover:opacity-100 active:scale-95 duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {!isSelectMode && (
          <button
            title="Share trace"
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
            className="w-10 h-10 rounded-full hover:bg-black/[0.05] flex items-center justify-center transition-colors text-black/40 active:scale-95"
          >
            <CornerUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TraceCard;
