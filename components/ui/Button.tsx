"use client";

import React from "react";
import { LoaderCircle } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "submit" | "button" | "reset";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = ({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-black text-white hover:bg-[#1d1d1f] shadow-sm",

    secondary:
      "bg-white border border-black/10 text-black hover:bg-[#f5f5f7] active:border-black/20",

    ghost:
      "bg-transparent text-black hover:bg-[#f5f5f7]",

    danger:
      "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "h-8 px-3.5 text-[13px] rounded-xl",

    md: "h-10 px-5 text-[14px] rounded-[14px]",

    lg: "h-12 px-7 text-[16px] rounded-[16px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {loading && (
        <LoaderCircle className="w-4 h-4 animate-spin shrink-0" />
      )}

      {children}
    </button>
  );
};

export default Button;