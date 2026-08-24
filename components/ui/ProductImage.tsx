import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-background text-sm text-muted",
          className,
        )}
      >
        No image
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-background", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        loading="eager"
        priority={priority}
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 320px"
      />
    </div>
  );
}
