import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Skeleton({ className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-lg bg-dark-700 motion-reduce:animate-none animate-pulse ${className}`}
      {...rest}
    />
  );
}
