"use client";

type Props = {
  message: string;
  type: "success" | "error";
  exiting: boolean;
};

export default function Toast({ message, type, exiting }: Props) {
  const isSuccess = type === "success";
  return (
    <div
      role="status"
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[100] flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 shadow-lg max-[420px]:max-w-[calc(100vw-2rem)] ${
        exiting ? "toast-animate-out" : "toast-animate-in"
      } ${
        isSuccess
          ? "border-emerald-700 bg-emerald-600 text-white"
          : "border-red-800 bg-red-700 text-white"
      } `}
    >
      <span className="text-lg" aria-hidden>
        {isSuccess ? "✓" : "✗"}
      </span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
