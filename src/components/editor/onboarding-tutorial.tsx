"use client";

import { useState, useEffect } from "react";

const TUTORIAL_STEPS = [
  {
    icon: "✨",
    title: "Story Vision",
    description:
      "Start by defining your book's title, description, and core vision. This helps the AI understand what you're creating.",
    target: "sidebar",
  },
  {
    icon: "📝",
    title: "Write Chapters",
    description:
      "Click 'Add chapter' to create new chapters. Select any chapter from the sidebar to start writing in the editor.",
    target: "add-chapter",
  },
  {
    icon: "👥",
    title: "Use the Editor",
    description:
      "Write your content in the main editor area. Line numbers help you track your progress. Your word count updates live.",
    target: "editor",
  },
  {
    icon: "💬",
    title: "AI Assistant",
    description:
      "Use this chat interface to brainstorm with the AI. It can help refine your ideas, suggest plot points, and develop characters.",
    target: "ai-assistant",
  },
];

export function OnboardingTutorial({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Reset animation on step change
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [step]);

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  // Position the tooltip based on the target
  const positions: Record<string, string> = {
    sidebar: "top-24 left-4",
    "add-chapter": "top-40 left-4",
    editor: "bottom-16 left-1/2 -translate-x-1/2",
    "ai-assistant": "bottom-16 right-8",
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/20 z-40 pointer-events-none rounded-2xl" />

      {/* Tutorial popup */}
      <div
        className={`absolute z-50 ${positions[current.target]} transition-all duration-300 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-zinc-200 p-6 w-[280px] relative">
          {/* Arrow notch */}
          <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-l border-t border-zinc-200 rotate-45" />

          {/* Close button */}
          <button
            onClick={onFinish}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition text-sm"
          >
            ✕
          </button>

          {/* Icon */}
          <div className="text-3xl mb-3">{current.icon}</div>

          {/* Content */}
          <h3 className="text-base font-bold text-zinc-900 mb-2">
            {current.title}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed mb-6">
            {current.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">
                {step + 1} of {TUTORIAL_STEPS.length}
              </span>
              <div className="flex gap-1">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "bg-orange-400 w-3" : "bg-zinc-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Previous
                </button>
              )}
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (isLast) {
                    onFinish();
                  } else {
                    setStep((s) => s + 1);
                  }
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm"
              >
                {isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
