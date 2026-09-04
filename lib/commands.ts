/** Spoken navigation commands. Matched conservatively; unknown phrases are read back, never guessed. */

export interface Command {
  id: "upload" | "sample" | "understand" | "home" | "read-page" | "help";
  href?: string;
  say: string;
}

const COMMANDS: { id: Command["id"]; href?: string; say: string; patterns: RegExp[] }[] = [
  {
    id: "upload",
    href: "/form#upload",
    say: "Opening the upload page. Choose a PDF and I'll guide you through it.",
    patterns: [/\bupload/, /\bmy (own )?(document|form|pdf|file)\b/, /\b(open|use|add|choose) (a |my )?(document|pdf|file)\b/],
  },
  {
    id: "sample",
    href: "/form?sample=1",
    say: "Opening the sample healthcare form.",
    patterns: [/\bsample\b/, /\bstart with voice\b/, /\b(start|begin|fill|complete)\b.*\bform\b/, /\bhealthcare form\b/, /\bregistration\b/],
  },
  {
    id: "understand",
    href: "/understand",
    say: "Opening Understand a Document.",
    patterns: [/\bunderstand\b/, /\b(lab|test) results?\b/, /\bread (a |my )?(document|report|table)\b/, /\bexplain (a |my )?document\b/],
  },
  { id: "home", href: "/", say: "Going to the home page.", patterns: [/\b(go )?home\b/, /\bhome page\b/, /\bstart over\b/, /\bmain page\b/] },
  { id: "read-page", say: "Reading this page.", patterns: [/\bread (this|the) page\b/, /\bread it to me\b/, /\bwhat('s| is) on (this|the) page\b/] },
  { id: "help", say: "You can say: upload a document, start with voice, understand a document, read this page, or go home.", patterns: [/\bhelp\b/, /\bwhat can (i|you)\b/, /\boptions\b/] },
];

export function parseCommand(transcript: string): Command | null {
  const t = transcript.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  for (const c of COMMANDS) {
    if (c.patterns.some((p) => p.test(t))) return { id: c.id, href: c.href, say: c.say };
  }
  return null;
}

export const COMMAND_PROMPT = "What would you like to do? You can say: upload a document, start with voice, or understand a document.";
