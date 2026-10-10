import Image from "next/image";

const PALETTES = [
  ["#14244a", "#24407a", "#27c4b8"],
  ["#0c1730", "#1c3160", "#57ddd0"],
  ["#0e5553", "#0b6b67", "#c8f7f0"],
  ["#1c3160", "#3d68b2", "#93eee2"],
  ["#24407a", "#14244a", "#ffd479"],
  ["#104745", "#14244a", "#93eee2"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Props = {
  title: string;
  subtitle?: string | null;
  label?: string | null;
  coverUrl?: string | null;
  alt?: string | null;
  brand?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
};

/**
 * A book-shaped cover. Uses the uploaded cover image when present; otherwise draws a clean typographic
 * cover so new products look finished before artwork exists.
 */
export function BookCover({ title, subtitle, label, coverUrl, alt, brand = "Website Growth Lab", size = "md", priority }: Props) {
  const [bg1, bg2, accent] = PALETTES[hash(title) % PALETTES.length];
  const titleSize = size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-sm" : "text-sm sm:text-lg";
  const sizes = size === "lg" ? "(min-width: 1024px) 400px, 80vw" : "(min-width: 1024px) 260px, 45vw";

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-r-md rounded-l-sm shadow-book">
      {coverUrl ? (
        <Image src={coverUrl} alt={alt || `Cover of ${title}`} fill sizes={sizes} className="object-cover" priority={priority} />
      ) : (
        <div
          role="img"
          aria-label={alt || `Cover of ${title}`}
          className="absolute inset-0 flex flex-col justify-between p-[9%]"
          style={{ background: `linear-gradient(150deg, ${bg1} 0%, ${bg2} 100%)` }}
        >
          <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: accent }} />
          <div aria-hidden className="absolute bottom-[22%] left-0 h-1 w-1/3" style={{ background: accent }} />
          {label ? (
            <p className="relative text-[0.6rem] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {label}
            </p>
          ) : (
            <span />
          )}
          <div className="relative">
            <p className={`font-display font-bold leading-tight text-white ${titleSize}`}>{title}</p>
            {subtitle && size !== "sm" && <p className="mt-2 text-xs leading-snug text-white/75">{subtitle}</p>}
          </div>
          <p className="relative text-[0.6rem] font-medium uppercase tracking-widest text-white/60">{brand}</p>
        </div>
      )}
      {/* spine highlight */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
    </div>
  );
}
