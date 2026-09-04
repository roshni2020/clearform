import { ShieldIcon } from "./Icons";

export const PRIVACY_STATEMENT =
  "ClearForm is designed for temporary document processing. Documents are not intended to be retained by ClearForm after the active session.";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p className="privacy-note" style={{ margin: 0, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
          <ShieldIcon className="icon" style={{ flex: "none", marginTop: 2 }} />
          <span>{PRIVACY_STATEMENT} No account is needed.</span>
        </p>
        <p style={{ margin: 0 }}>ClearForm — Hear → Speak → Confirm → Complete → Download</p>
      </div>
    </footer>
  );
}
