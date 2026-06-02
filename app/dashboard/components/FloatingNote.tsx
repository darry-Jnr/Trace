"use client";

import React from "react";

export default function FloatingNote() {
    return (
        <div
            className="
                absolute
                top-4
                right-4
                z-[1000]
                hidden
                sm:block
                w-[280px]
                rounded-3xl
                bg-white/95
                backdrop-blur
                border
                border-black/5
                shadow-xl
                p-4
                animate-[fadeIn_0.5s_ease-out]
            "
        >
            <p className="text-xs text-black/40 font-medium select-none">
                Example note
            </p>

            <p className="mt-2 text-sm text-black/80 leading-relaxed font-medium select-none">
                Turn after the pharmacy, then enter the second street beside the yellow gate.
            </p>
        </div>
    );
}
