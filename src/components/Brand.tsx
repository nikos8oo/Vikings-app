import Image from "next/image";
import Link from "next/link";

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Image src="/mark-white.png" alt="Vikings" width={size} height={Math.round((size * 273) / 263)} className={className} priority />;
}

export function Brand({ href = "/accueil", sub = "Athletes" }: { href?: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Mark size={26} />
      <span className="leading-none">
        <span className="display block text-[19px] text-fog">Vikings</span>
        <span className="block text-[9px] font-semibold uppercase tracking-[0.32em] text-lime">{sub}</span>
      </span>
    </Link>
  );
}
