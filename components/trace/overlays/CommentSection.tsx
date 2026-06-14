"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Pin, PinOff, Send, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Comment {
  id: string;
  trace_id: string;
  author_name: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  visitor_id?: string;
}

interface CommentSectionProps {
  traceId: string;
  traceTitle: string;
  isAuthor: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNameRequired: () => void;
  visitorName: string | null;
  onCommentPosted?: () => void;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function CommentSection({
  traceId,
  traceTitle,
  isAuthor,
  isOpen,
  onClose,
  onNameRequired,
  visitorName,
  onCommentPosted,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !traceId) return;
    setLoading(true);
    fetch(`/api/trace/${traceId}/comments`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setComments(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, traceId]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!visitorName) {
      onNameRequired();
      return;
    }

    setSending(true);
    try {
      const visitorId = localStorage.getItem("visitor_id") || "";
      const res = await fetch(`/api/trace/${traceId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: visitorName,
          content: text,
          visitor_id: visitorId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setComments((prev) => [...prev, result.data]);
        setInput("");
        onCommentPosted?.();
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        toast.error("Failed to post", result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to post", "Could not save your comment. Please try again.");
    }
    setSending(false);
  };

  const handleTogglePin = async (commentId: string) => {
    try {
      const visitorId = localStorage.getItem("visitor_id") || "";
      const res = await fetch(`/api/trace/${traceId}/comments/${commentId}/pin`, {
        method: "POST",
        headers: {
          "x-visitor-id": visitorId,
        },
      });
      const result = await res.json();
      if (result.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, is_pinned: !c.is_pinned } : c
          )
        );
      } else {
        toast.error("Failed to pin", result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to pin", "Could not update pin status.");
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingIds((prev) => new Set(prev).add(commentId));
    try {
      const visitorId = localStorage.getItem("visitor_id") || "";
      const res = await fetch(`/api/trace/${traceId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "x-visitor-id": visitorId,
        },
      });
      const result = await res.json();
      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } else {
        toast.error("Failed to delete", result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to delete", "Could not remove comment.");
    }
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(commentId);
      return next;
    });
  };

  if (!isOpen) return null;

  const pinnedComment = comments.find((c) => c.is_pinned);
  const regularComments = comments.filter((c) => !c.is_pinned);

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-40 bg-black/20 animate-fade-in" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col bg-white animate-slide-up-sheet md:animate-slide-in-right rounded-t-2xl md:rounded-none max-h-[85vh] md:max-h-none md:left-auto md:top-0 md:right-0 md:w-[420px] md:h-full shadow-[0_-10px_40px_rgba(0,0,0,0.12)]">
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-8 h-1 rounded-full bg-black/15" />
      </div>
      {/* Header */}
      <header className="px-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-black/40" />
          <h2 className="text-[15px] font-bold tracking-tight">Comments</h2>
          <span className="text-[12px] font-medium text-black/30">{comments.length}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-3.5 h-3.5 text-black/50" />
        </button>
      </header>

      {/* Comment list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-black/10 border-t-black animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="w-8 h-8 text-black/15 mb-3" />
            <p className="text-[13px] font-medium text-black/30">No comments yet</p>
          </div>
        ) : (
          <>
            {pinnedComment && (
              <div className="rounded-2xl bg-black/[0.03] border border-black/[0.04] p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Pin className="w-3 h-3 text-black/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30">Pinned</span>
                </div>
                <CommentRow
                  comment={pinnedComment}
                  isAuthor={isAuthor}
                  onPinToggle={handleTogglePin}
                  onDelete={handleDelete}
                  isDeleting={deletingIds.has(pinnedComment.id)}
                />
              </div>
            )}
            {regularComments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isAuthor={isAuthor}
                onPinToggle={handleTogglePin}
                onDelete={handleDelete}
                isDeleting={deletingIds.has(comment.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-black/[0.04] shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            className="flex-1 h-10 px-4 rounded-full bg-[#f5f5f7] text-[13px] font-medium outline-none placeholder:text-black/25 focus:bg-white focus:border focus:border-black/10 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none"
          >
            {sending ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

function CommentRow({
  comment,
  isAuthor,
  onPinToggle,
  onDelete,
  isDeleting,
}: {
  comment: Comment;
  isAuthor: boolean;
  onPinToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.04] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-black tracking-tight">
              {comment.author_name}
            </span>
            <span className="text-[11px] font-medium text-black/30">
              {formatTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-black/70 leading-snug whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPinToggle(comment.id)}
              className="w-7 h-7 rounded-full bg-black/[0.03] flex items-center justify-center shrink-0 active:scale-90 transition-transform hover:bg-black/[0.06]"
              title={comment.is_pinned ? "Unpin" : "Pin"}
            >
              {comment.is_pinned ? (
                <PinOff className="w-3 h-3 text-black/40" />
              ) : (
                <Pin className="w-3 h-3 text-black/30" />
              )}
            </button>
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              className="w-7 h-7 rounded-full bg-black/[0.03] flex items-center justify-center shrink-0 active:scale-90 transition-transform hover:bg-red-50 disabled:opacity-30"
              title="Delete"
            >
              {isDeleting ? (
                <div className="w-3 h-3 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 text-black/30" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
