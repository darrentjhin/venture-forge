"use client";

import { useState } from "react";
import { BACKGROUNDS } from "@/lib/game/config";
import type { Background } from "@/lib/game/types";

export function Onboarding({ savedName, onStart, onResume }: { savedName?: string; onStart: (data: { name: string; email: string; background: Background }) => void; onResume?: () => void }) {
  const [step, setStep] = useState<"welcome" | "account" | "background">("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [background, setBackground] = useState<Background>("Engineering");

  if (step === "welcome") {
    return (
      <main className="entry-shell">
        <div className="entry-grid" />
        <nav className="entry-nav"><div className="brand-mark">V</div><span>VENTURE<br />FORGE</span><span className="build-tag">FOUNDER SIMULATION / 01</span></nav>
        <section className="entry-copy">
          <span className="eyebrow">A LONG-TERM COMPANY SIMULATION</span>
          <h1>Build something<br /><em>that outlives the hype.</em></h1>
          <p>Start with one laptop and $2,000. Make the calls that turn a scrappy idea into a company worth remembering.</p>
          <div className="entry-actions">
            {savedName && onResume && <button className="primary-button" onClick={onResume}>Continue {savedName}&apos;s career <span>→</span></button>}
            <button className={savedName ? "ghost-button" : "primary-button"} onClick={() => setStep("account")}>Start a new career <span>→</span></button>
          </div>
        </section>
        <div className="entry-vignette" aria-hidden="true">
          <div className="mini-room"><span className="mini-desk" /><span className="mini-laptop" /><span className="mini-founder" /><span className="mini-lamp" /><span className="mini-plant" /></div>
          <div className="start-balance"><small>STARTING BALANCE</small><strong>$2,000</strong><span>One founder. One laptop. No shortcuts.</span></div>
        </div>
        <footer className="entry-footer"><span>BUILD / SURVIVE / COMPOUND</span><span>NO PAY TO WIN · PERSISTENT SAVE</span></footer>
      </main>
    );
  }

  if (step === "account") {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-card">
          <button className="back-link" onClick={() => setStep("welcome")}>← Back</button>
          <span className="step-count">01 / 02</span><span className="eyebrow">FOUNDER PROFILE</span>
          <h1>Put your name on the cap table.</h1>
          <p>This founder identity persists even when companies don&apos;t.</p>
          <label>Founder name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex Morgan" autoFocus /></label>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="founder@company.com" /></label>
          <button className="primary-button wide" disabled={name.trim().length < 2 || !email.includes("@")} onClick={() => setStep("background")}>Choose your background <span>→</span></button>
          <small>Your progress is saved automatically on this device and safely upgraded as the game evolves.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card wide-card">
        <button className="back-link" onClick={() => setStep("account")}>← Back</button>
        <span className="step-count">02 / 02</span><span className="eyebrow">FOUNDER EDGE</span>
        <h1>What do you bring to the table?</h1>
        <p>Every background opens a different early advantage. None is a permanent ceiling.</p>
        <div className="background-grid">
          {BACKGROUNDS.map((option) => (
            <button key={option.name} className={background === option.name ? "background-option active" : "background-option"} onClick={() => setBackground(option.name)}>
              <span className="option-index">0{BACKGROUNDS.indexOf(option) + 1}</span><strong>{option.name}</strong><span>{option.tagline}</span><small>{option.bonus}</small>
            </button>
          ))}
        </div>
        <button className="primary-button wide" onClick={() => onStart({ name: name.trim(), email: email.trim(), background })}>Begin with $2,000 <span>→</span></button>
      </section>
    </main>
  );
}
