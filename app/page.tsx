import Link from "next/link";
import { VoiceDemoCard } from "@/components/VoiceDemoCard";
import { ReadPageButton } from "@/components/ReadPageButton";
import { ArrowIcon, CheckIcon, MicIcon, ShieldIcon, SpeakerIcon, UploadIcon, WarningIcon } from "@/components/Icons";
import { PRIVACY_STATEMENT } from "@/components/Footer";

const PAGE_SPEECH =
  "ClearForm. Important documents, understood by voice. ClearForm helps blind and low-vision users understand and complete complex documents through a guided voice conversation. Three steps, start to finish. Step one, upload: choose a form or document. Step two, talk: ClearForm asks one question at a time and confirms what it heard. Step three, complete: review the document and download the completed PDF. Our principle: if ClearForm knows, it explains. If you answer, it confirms. If ClearForm is unsure, it says so. To begin, choose Start with Voice or Upload a Document.";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">
              <SpeakerIcon width={18} height={18} /> Voice-first accessibility
            </p>
            <h1>Important documents, understood by voice.</h1>
            <p className="lede">ClearForm helps blind and low-vision users understand and complete complex documents through a guided voice conversation.</p>
            <ReadPageButton text={PAGE_SPEECH} />
            <div className="hero-cta">
              <Link href="/form?sample=1" className="btn btn-primary btn-lg">
                <MicIcon className="icon" /> Start with Voice
              </Link>
              <Link href="/form" className="btn btn-secondary btn-lg">
                <UploadIcon className="icon" /> Upload a Document
              </Link>
            </div>
            <blockquote className="principle-quote">
              If ClearForm knows, it explains. If you answer, it confirms. If ClearForm is unsure, it says so.
            </blockquote>
          </div>
          <VoiceDemoCard />
        </div>
      </section>

      <section className="section" aria-labelledby="how-title" style={{ background: "var(--surface)", borderBlock: "1px solid var(--border)" }}>
        <div className="container">
          <h2 id="how-title">Three steps, start to finish</h2>
          <ol className="steps" style={{ listStyle: "none", padding: 0, margin: "1.75rem 0 0" }}>
            <li className="card step">
              <div className="step-head"><span className="step-num" aria-hidden="true">1</span><UploadIcon width={24} height={24} /></div>
              <h3>Upload</h3>
              <p>Choose a form or document.</p>
            </li>
            <li className="card step">
              <div className="step-head"><span className="step-num" aria-hidden="true">2</span><MicIcon width={24} height={24} /></div>
              <h3>Talk</h3>
              <p>ClearForm asks one question at a time and confirms what it heard.</p>
            </li>
            <li className="card step">
              <div className="step-head"><span className="step-num" aria-hidden="true">3</span><CheckIcon width={24} height={24} /></div>
              <h3>Complete</h3>
              <p>Review the document and download the completed PDF.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="does-title">
        <div className="container">
          <h2 id="does-title">What ClearForm does</h2>
          <p className="muted" style={{ fontSize: "1.1rem", maxWidth: "46rem" }}>Three rules govern everything ClearForm says, so the experience stays safe even when you can&rsquo;t see the screen.</p>
          <div className="principle-lines" style={{ margin: "1.75rem 0 0", maxWidth: "none" }}>
            <div className="card">
              <SpeakerIcon width={26} height={26} style={{ color: "var(--action)" }} />
              <strong>If ClearForm knows, it explains.</strong>
              <span className="muted">Plain-language explanations of forms and terminology, backed by official sources.</span>
            </div>
            <div className="card">
              <CheckIcon width={26} height={26} style={{ color: "var(--success)" }} />
              <strong>If you answer, it confirms.</strong>
              <span className="muted">Every value is read back and confirmed before a field is filled. Signatures are left for you.</span>
            </div>
            <div className="card">
              <WarningIcon width={26} height={26} style={{ color: "var(--warning)" }} />
              <strong>If ClearForm is unsure, it says so.</strong>
              <span className="muted">Low-confidence values are marked for human review — never guessed.</span>
            </div>
          </div>
          <div style={{ marginTop: "1.75rem" }}>
            <Link href="/understand" className="btn btn-secondary">
              Understand a Document <ArrowIcon className="icon" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="org-title" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="container org-grid">
          <div>
            <p className="eyebrow">For Organizations</p>
            <h2 id="org-title">Make complex documents accessible without rebuilding your workflow.</h2>
            <p className="muted" style={{ fontSize: "1.1rem" }}>
              ClearForm is an accessibility layer that sits on top of the documents you already use. Integrate it into existing intake, claims, enrollment and onboarding flows to serve blind and low-vision customers safely.
            </p>
            <h3 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Who it serves</h3>
            <ul className="chip-list">
              {["Healthcare providers", "Insurers", "Government agencies", "Banks", "Universities", "Legal organizations"].map((c) => (
                <li key={c} className="chip">{c}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3>Deployment options</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: 0, display: "grid", gap: "0.6rem" }}>
              <li><strong>API</strong> — add voice-guided completion to your own apps.</li>
              <li><strong>Embedded accessibility widget</strong> — drop ClearForm onto existing document pages.</li>
              <li><strong>Secure enterprise portal</strong> — a hosted, branded experience for your users.</li>
            </ul>
            <p className="muted small" style={{ marginTop: "1.25rem", marginBottom: 0, display: "flex", gap: "0.5rem" }}>
              <ShieldIcon width={18} height={18} style={{ flex: "none", marginTop: 2 }} />
              <span>{PRIVACY_STATEMENT}</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
