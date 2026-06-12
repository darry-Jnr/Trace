"use client";

import React, { useRef, useState, useEffect } from "react";
import { CornerUpRight, Copy, Trash2, MoreVertical, Route, Clock, X, AlertTriangle, Pencil } from "lucide-react";

interface TraceCardProps {
  title: string;
  link: string;
  date: string;
  distance?: string;

  isRecent?: boolean;
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
  isRecent = false,
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
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(title);

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
    if (isRecent || isSelectMode) return;
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
          ${isRecent ? "bg-[#efefec]" : "bg-white"}
          ${isSelected ? "ring-2 ring-black bg-neutral-50/50 border-black/20" : ""}
          hover:border-black/10 active:scale-[0.99]`}
      >
        <div className="flex items-center min-w-0 flex-1">
          {isSelectMode && !isRecent && (
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
            <h3 className="text-[15px] font-semibold text-black tracking-tight leading-snug truncate">
              {title}
            </h3>

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
          {/* More icon — dropdown on mobile & desktop */}
          {!isSelectMode && (
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
                      setRenameValue(title);
                      setShowRename(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowDetail(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    Details
                  </button>
                  <div className="mx-3 my-1.5 h-px bg-black/[0.06]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
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

      {/* Detail modal — centered */}
      {showDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowDetail(false)}>
          <div className="absolute inset-0 bg-black/20 animate-fade-in" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white w-[340px] sm:w-[360px] rounded-[28px] p-6 animate-scale-up-modal shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <button
              onClick={() => setShowDetail(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-3.5 h-3.5 text-black/50" />
            </button>

            <h3 className="text-[20px] font-bold tracking-tight text-black pr-8">
              {title}
            </h3>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#f5f5f7]">
                <Clock className="w-4 h-4 text-black/40 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40">Created</p>
                  <p className="text-[14px] font-medium text-black/80 mt-0.5">{date}</p>
                </div>
              </div>

              {distance && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#f5f5f7]">
                  <Route className="w-4 h-4 text-black/40 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40">Distance</p>
                    <p className="text-[14px] font-medium text-black/80 mt-0.5">{distance}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#f5f5f7]">
                <CornerUpRight className="w-4 h-4 text-black/40 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-black/40">Link</p>
                  <p className="text-[14px] font-medium text-black/80 mt-0.5 truncate">{link}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal — centered */}
      {showRename && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowRename(false)}>
          <div className="absolute inset-0 bg-black/20 animate-fade-in" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white w-[340px] rounded-[28px] p-6 animate-scale-up-modal shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold tracking-tight text-black">
                Rename trace
              </h3>
              <button
                onClick={() => setShowRename(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center active:scale-90 transition-transform shrink-0"
              >
                <X className="w-3.5 h-3.5 text-black/50" />
              </button>
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Trace name"
              maxLength={40}
              autoFocus
              className="w-full h-12 px-4 rounded-2xl bg-[#f5f5f7] border border-transparent focus:border-black/10 focus:bg-white outline-none transition text-[15px] font-medium tracking-tight placeholder:text-black/25"
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  setShowRename(false);
                  onRename?.(renameValue.trim());
                }
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowRename(false)}
                className="flex-1 h-11 rounded-2xl bg-[#f5f5f7] text-[13px] font-semibold text-black/50 active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameValue.trim()) {
                    setShowRename(false);
                    onRename?.(renameValue.trim());
                  }
                }}
                className="flex-1 h-11 rounded-2xl bg-black text-white text-[13px] font-semibold active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal — centered */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="absolute inset-0 bg-black/20 animate-fade-in" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white w-[320px] rounded-[28px] p-6 animate-scale-up-modal shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-[18px] font-bold tracking-tight text-black">
                Delete trace?
              </h3>
              <p className="mt-2 text-[13px] text-black/50 font-medium leading-relaxed">
                This will permanently remove this trace from your dashboard and the server.
              </p>
              <div className="mt-6 w-full flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-11 rounded-2xl bg-[#f5f5f7] text-[13px] font-semibold text-black/60 active:scale-[0.98] transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.();
                  }}
                  className="flex-1 h-11 rounded-2xl bg-red-500 text-white text-[13px] font-semibold active:scale-[0.98] transition-transform"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TraceCard;
