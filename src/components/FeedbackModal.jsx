import { useState } from "react";
import posthog from "posthog-js";
import { useT } from "../constants.js";

const CONTACT_EMAIL = "dincerbnur@gmail.com";

export function FeedbackModal({ onClose }) {
  const T = useT();
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 24, padding: "28px 24px", width: "90%", maxWidth: 360, boxShadow: "0 32px 80px rgba(0,0,0,0.6)", animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 6 }}>Geri Bildirim</div>
        <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 500, lineHeight: 1.7, marginBottom: 22 }}>
          Öneri, hata bildirimi veya düşünceleriniz için bize mail atabilirsiniz:
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.glass, border: `1px solid ${T.border}`, borderRadius: 14, padding: "10px 14px", marginBottom: 18 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.lavender, flex: 1, textAlign: "left", wordBreak: "break-all" }}>{CONTACT_EMAIL}</span>
          <button
            onClick={copyEmail}
            title="Kopyala"
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: copied ? T.mint : T.textMuted, fontSize: 18, lineHeight: 1, padding: 2, transition: "color 0.2s" }}
          >
            {copied ? "✓" : "⎘"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: T.glass, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 600, color: T.textMuted, cursor: "pointer" }}
          >
            Kapat
          </button>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("FocusGhost Geri Bildirim")}`}
            onClick={() => posthog.capture("feedback_mailto_clicked")}
            style={{ flex: 2, background: T.lavender + "22", border: `1px solid ${T.lavender}44`, borderRadius: 12, padding: "10px", fontSize: 13, fontWeight: 700, color: T.lavender, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            ✉️ Mail At
          </a>
        </div>
      </div>
    </div>
  );
}
