"use client";

import React, { useRef, useState, useEffect } from "react";
import { CornerUpRight, Copy, Trash2, MoreVertical, Route, X, Pencil, User, Users } from "lucide-react";

interface TraceCardProps {
  title: string;
  link: string;
  date: string;
  distance?: string;

  isOwner?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  onLongPress?: () => void;
  onShare?: () => void;
  onClick?: () => void;

}

const TraceCard = ({
  title,
  link,
  date,
  distance,
  isOwner = false,
  isSelectMode = false,
  isSelected = false,
  onSelectToggle,
  onDelete,
  onRename,
  onLongPress,
  onShare,
  onClick,
}: TraceCardProps) => {
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [showMenu]);

  const handleTouchStart = () => {
    if (!isOwner || isSelectMode) return;
    touchTimerRef.current = setTimeout(() => {
      onLongPress?.();
    }, 600);
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
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
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
        className={`group w-full flex items-center justify-between p-4 sm:p-5 rounded-[24px] border border-black/[0.05] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 select-none
          ${isOwner ? "bg-white" : "bg-[#f5f5f7]"}
          ${isSelected ? "ring-2 ring-black bg-neutral-50/50 border-black/20" : ""}
          hover:border-black/10 active:scale-[0.99]`}
      >
        <div className="flex items-center min-w-0 flex-1">
          {isSelectMode && isOwner && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectToggle?.();
              }}
              className="mr-3 sm:mr-4 flex items-center justify-center shrink-0 animate-fade-in"
            >
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-black border-black text-white"
                    : "bg-white border-black/20 text-transparent"
                }`}
              >
                <svg className="w-3.5 h-3.5 stroke-[3.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          )}

          <div className="min-w-0 text-left flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editValue.trim()) {
                      setIsEditing(false);
                      onRename?.(editValue.trim());
                    }
                    if (e.key === "Escape") {
                      setIsEditing(false);
                      setEditValue(title);
                    }
                  }}
                  onBlur={() => {
                    if (editValue.trim() && editValue.trim() !== title) {
                      onRename?.(editValue.trim());
                    } else {
                      setEditValue(title);
                    }
                    setIsEditing(false);
                  }}
                  className="text-[15px] font-semibold text-black tracking-tight leading-snug bg-transparent border-b border-black/20 outline-none py-0.5 min-w-[120px]"
                  autoFocus
                  maxLength={40}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3
                  className="text-[15px] font-semibold text-black tracking-tight leading-snug truncate"
                  onClick={(e) => {
                    if (!isSelectMode && isOwner) {
                      e.stopPropagation();
                      setEditValue(title);
                      setIsEditing(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }
                  }}
                >
                  {title}
                </h3>
              )}
              {!isOwner && <span title="Shared trace"><Users className="w-3.5 h-3.5 text-black/30 shrink-0" /></span>}
            </div>

            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[13px] text-black/50 truncate max-w-[140px] sm:max-w-[220px] font-medium leading-none">
                {link}
              </span>
              {!isSelectMode && (
                <button
                  title="Copy link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.();
                  }}
                  className="text-black/30 hover:text-black transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2 sm:ml-3">
          {!isSelectMode && isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-black/40 hover:bg-black/[0.05] active:scale-90 cursor-pointer"
                title="More"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-2xl border border-black/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.12)] py-2 z-50 animate-fade-in">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onShare?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
                  >
                    <CornerUpRight className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setEditValue(title);
                      setIsEditing(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Rename
                  </button>
                  <div className="mx-3 my-1.5 h-px bg-black/[0.06]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete?.();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </>
  );
};

export default TraceCard;
