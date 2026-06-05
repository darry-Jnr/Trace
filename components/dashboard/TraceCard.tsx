"use client";

import React from "react";
import { CornerUpRight, Copy } from "lucide-react"; // Replaced Share with CornerUpRight

interface TraceCardProps {
  title: string;
  link: string;
  date: string;
  isRecent?: boolean;
  onShare?: () => void;
  onClick?: () => void;
}

const TraceCard = ({ title, link, date, isRecent = false, onShare, onClick }: TraceCardProps) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`w-full flex items-center justify-between p-5 rounded-[24px] border border-black/[0.05] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25
        ${isRecent ? "bg-[#efefec]" : "bg-white"}
        hover:border-black/10 active:scale-[0.99]`}
    >
      <div className="min-w-0 text-left">
        <h3 className="text-[15px] font-medium text-black tracking-tight">{title}</h3>
        
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-black/50 truncate max-w-[120px] sm:max-w-[200px]">{link}</span>
            <button 
              title="Copy link"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(link); }}
              className="text-black/30 hover:text-black transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          
          <span className="text-[13px] text-black/20 shrink-0">{date}</span>
        </div>
      </div>

      <button 
        title="Share trace"
        onClick={(e) => { e.stopPropagation(); onShare?.(); }}
        className="w-10 h-10 rounded-full hover:bg-black/[0.05] flex items-center justify-center transition-colors text-black/40 shrink-0"
      >
        <CornerUpRight className="w-4 h-4" /> {/* Now matches image_2320bd.png */}
      </button>
    </div>
  );
};

export default TraceCard;
