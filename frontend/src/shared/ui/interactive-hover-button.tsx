import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-auto min-w-[140px] px-6 h-10 cursor-pointer overflow-hidden rounded-full border border-border bg-surface flex items-center justify-center font-semibold text-text-primary",
        className,
      )}
      {...props}
    >
      <span className="inline-block relative z-10 transition-all duration-[650ms] group-hover:translate-x-12 group-hover:opacity-0">
        {text}
      </span>
      <div className="absolute top-0 left-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-canvas dark:text-black opacity-0 transition-all duration-[650ms] group-hover:translate-x-0 group-hover:opacity-100">
        <span>{text}</span>
        <ArrowRight size={18} strokeWidth={2.5} />
      </div>
      <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-0 opacity-0 rounded-lg bg-accent transition-all duration-[650ms] group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[2] group-hover:opacity-100 group-hover:bg-accent z-0"></div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
