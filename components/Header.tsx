"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccessibilityMenu } from "./AccessibilityMenu";
import { VoiceCommandButton } from "./VoiceCommand";
import { SpeakerIcon } from "./Icons";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/form", label: "Complete a Form" },
  { href: "/understand", label: "Understand a Document" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="ClearForm home">
          <span className="brand-mark" aria-hidden="true">
            <SpeakerIcon width={20} height={20} />
          </span>
          <span className="brand-text">ClearForm</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <VoiceCommandButton />
          <AccessibilityMenu />
        </div>
      </div>
    </header>
  );
}
