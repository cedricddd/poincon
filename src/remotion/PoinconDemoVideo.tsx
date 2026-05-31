/* eslint-disable react/forbid-component-props */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

/* ─── Tokens ─────────────────────────────────────────────────────── */
interface Theme {
  bg: string; bgCard: string; bgPhone: string; bgStat: string;
  ink: string; muted: string; line: string;
  green: string; greenDim: string; indigo: string; red: string;
  font: string; mono: string;
}

const LIGHT: Theme = {
  bg: "#f1f5f9",
  bgCard: "#ffffff",
  bgPhone: "#ffffff",
  bgStat: "#f8fafc",
  ink: "#1a1a1a",
  muted: "#6b7280",
  line: "#cbd5e1",
  green: "#10b981",
  greenDim: "#059669",
  indigo: "#6366f1",
  red: "#ef4444",
  font: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
};

const DARK: Theme = {
  bg: "#0f172a",
  bgCard: "#1e293b",
  bgPhone: "#0f172a",
  bgStat: "#0f172a",
  ink: "#f1f5f9",
  muted: "#94a3b8",
  line: "#334155",
  green: "#10b981",
  greenDim: "#059669",
  indigo: "#818cf8",
  red: "#f87171",
  font: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
};

const IS_DARK = process.env.REMOTION_THEME === "dark";
const C: Theme = IS_DARK ? DARK : LIGHT;

/* ─── Timeline (30 fps)
 *   0 –  90  Intro logo + badge
 *  90 – 360  Scène mobile : employé pointe
 * 360 – 540  Scène admin  : dashboard + approbation
 * 540 – 630  Scène manager : vue équipe
 * 630 – 720  CTA fade-out
 * ──────────────────────────────────────────────────────────────────── */

const spr = (frame: number, start: number, fps: number, cfg = { damping: 16, stiffness: 120, mass: 0.7 }) =>
  spring({ frame: Math.max(0, frame - start), fps, config: cfg });

const fade = (frame: number, start: number, dur = 20) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/* ─── Background blobs ───────────────────────────────────────────── */
const Bg: React.FC<{ frame: number }> = ({ frame }) => {
  const p1 = Math.sin(frame * 0.03) * 0.5 + 0.5;
  const p2 = Math.sin(frame * 0.02 + 2) * 0.5 + 0.5;
  const p3 = Math.sin(frame * 0.015 + 4) * 0.5 + 0.5;
  return (
    <>
      <div style={{
        position: "absolute", top: -150, left: -150, width: 600, height: 600,
        borderRadius: "50%", background: C.green, filter: "blur(200px)",
        opacity: 0.1 * p1,
      }} />
      <div style={{
        position: "absolute", bottom: -200, right: -100, width: 650, height: 650,
        borderRadius: "50%", background: C.indigo, filter: "blur(220px)",
        opacity: 0.07 * p2,
      }} />
      <div style={{
        position: "absolute", top: "40%", left: "50%", width: 400, height: 400,
        borderRadius: "50%", background: C.green, filter: "blur(180px)",
        opacity: 0.04 * p3, transform: "translate(-50%, -50%)",
      }} />
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(${C.green}20 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
    </>
  );
};

/* ─── Scene 1 : Intro (0–90) ─────────────────────────────────────── */
const SceneIntro: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const logoS = spr(frame, 0, fps);
  const badgeS = spr(frame, 20, fps);
  const subS = spr(frame, 40, fps);
  const glowPulse = 1 + Math.sin(frame * 0.08) * 0.15;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
      {/* Glow ring behind logo */}
      <div style={{
        position: "absolute",
        width: 500, height: 500,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${C.green}22 0%, transparent 70%)`,
        transform: `scale(${glowPulse})`,
        filter: "blur(40px)",
      }} />

      {/* Logo SVG */}
      <div style={{
        opacity: interpolate(logoS, [0, 1], [0, 1]),
        transform: `scale(${interpolate(logoS, [0, 1], [0.5, 1])})`,
        position: "relative",
        width: 480,
      }}>
        <Img
          src={staticFile(IS_DARK ? "images/logo-dark.svg" : "images/logo-light.svg")}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      {/* Badge conformité */}
      <div style={{
        opacity: interpolate(badgeS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(badgeS, [0, 1], [20, 0])}px)`,
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 28px", borderRadius: 40,
        border: `1.5px solid ${C.green}55`,
        background: `${C.green}14`,
        boxShadow: `0 0 30px ${C.green}22`,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green,
          boxShadow: `0 0 12px ${C.green}` }} />
        <span style={{ fontSize: 18, fontWeight: 700, color: C.green, fontFamily: C.font, letterSpacing: 1 }}>
          Conforme Belgique 2027
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: interpolate(subS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(subS, [0, 1], [15, 0])}px)`,
        fontSize: 22, color: C.muted, fontFamily: C.font, textAlign: "center" as const,
      }}>
        Pointeuse légale pour PME belges · Simple · Mobile-first · RGPD
      </div>
    </AbsoluteFill>
  );
};

/* ─── Phone mockup component ─────────────────────────────────────── */
const Phone: React.FC<{ children: React.ReactNode; scale?: number; opacity?: number }> = ({
  children, scale = 1, opacity = 1,
}) => (
  <div style={{
    width: 320, height: 620,
    background: IS_DARK ? "#111827" : "#1c1c1e",
    borderRadius: 52,
    padding: 6,
    boxShadow: IS_DARK
      ? `0 0 90px rgba(16,185,129,0.25), 0 0 40px rgba(255,255,255,0.12), 0 30px 80px rgba(0,0,0,0.7)`
      : `0 0 60px rgba(16,185,129,0.2), 0 30px 80px rgba(0,0,0,0.4)`,
    transform: `scale(${scale})`,
    opacity,
    position: "relative",
  }}>
    {/* Halo ring */}
    <div style={{
      position: "absolute",
      inset: -20,
      borderRadius: 72,
      background: `radial-gradient(ellipse at center, ${C.green}18 0%, transparent 65%)`,
      filter: "blur(20px)",
      zIndex: -1,
    }} />
    {/* Inner screen */}
    <div style={{
      width: "100%", height: "100%",
      background: C.bgPhone,
      borderRadius: 46,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Status bar with camera punch-hole */}
      <div style={{
        height: 38,
        background: C.bgPhone,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      }}>
        <div style={{
          width: 90, height: 24, borderRadius: 12,
          background: IS_DARK ? "#0a0a0a" : "#0d0d0d",
        }} />
      </div>
      <div style={{ flex: 1, padding: "0 18px 18px", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  </div>
);

/* ─── Scene 2 : Mobile pointage (90–360) ─────────────────────────── */
// Phase 1 (local 0–120)  : horloge + bouton ARRIVÉE vert → tap → ARRIVÉE ✓
// Phase 2 (local 130–270): EN COURS + chrono + bouton DÉPART rouge
const SceneMobile: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const local = frame - 90;

  const labelS     = spr(frame, 90,  fps);
  const phoneS     = spr(frame, 105, fps);
  const clockPulse = 1 + Math.sin(local * 0.12) * 0.008;

  // Phase 1 : tap à local=75
  const tapAnim    = spr(frame, 165, fps, { damping: 10, stiffness: 200, mass: 0.5 });
  const tapped     = local >= 75;
  const tapScale   = tapped ? interpolate(tapAnim, [0, 1], [0.92, 1]) : 1;
  const entry1O    = tapped ? fade(frame, 175, 20) : 0;

  // Phase 2 : transition vers EN COURS à local=120
  const phase2O    = interpolate(local, [110, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phase1O    = interpolate(local, [100, 130], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Chrono EN COURS (compte depuis local=140, +1s toutes les 30 frames)
  const chronoSec  = Math.max(0, Math.floor((local - 140) / 30));
  const mm = String(Math.floor(chronoSec / 60)).padStart(2, "0");
  const ss = String(chronoSec % 60).padStart(2, "0");
  const chronoStr  = `00:${mm}:${ss}`;

  const timeStr    = "09:42:17";
  const dateStr    = "Samedi 9 mai 2026";

  // Halo couleur change avec la phase
  const haloColor  = local >= 130 ? C.red : C.green;
  const haloScale  = 1 + Math.sin(local * 0.06) * 0.08;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, paddingTop: 40 }}>

      {/* ── Top banner ── */}
      <div style={{
        opacity: interpolate(labelS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(labelS, [0, 1], [-24, 0])}px)`,
        textAlign: "center" as const,
        paddingBottom: 28,
      }}>
        <div style={{
          display: "inline-block",
          fontSize: 11, fontWeight: 700, color: C.green, fontFamily: C.font,
          letterSpacing: 3, textTransform: "uppercase" as const,
          padding: "5px 18px", borderRadius: 20,
          background: `${C.green}14`, border: `1px solid ${C.green}33`,
          marginBottom: 16,
        }}>
          Côté employé
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, fontFamily: C.font, color: C.ink, lineHeight: 1.1, letterSpacing: -1.5 }}>
          Pointez en <span style={{ color: C.green }}>1 tap.</span>
        </div>
        <div style={{ fontSize: 16, color: C.muted, fontFamily: C.font, marginTop: 10 }}>
          ARRIVÉE ou DÉPART en un geste · Enregistrement légal immédiat
        </div>
      </div>

      {/* ── Phone + halo ── */}
      <div style={{
        transform: `scale(${interpolate(phoneS, [0, 1], [0.78, 1])}) translateY(${interpolate(phoneS, [0, 1], [50, 0])}px)`,
        opacity: interpolate(phoneS, [0, 1], [0, 1]),
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Halo (change vert → rouge) */}
        <div style={{
          position: "absolute",
          width: 420, height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${haloColor}22 0%, transparent 70%)`,
          transform: `scale(${haloScale})`,
          filter: "blur(30px)",
          zIndex: 0,
          transition: "background 0.5s",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <Phone scale={0.9}>
            {/* Status bar */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11, color: C.muted, fontFamily: C.mono, marginBottom: 12,
            }}>
              <span>{timeStr}</span>
              <span>●●●</span>
            </div>

            {/* ── PHASE 1 : Arrivée ── */}
            <div style={{ opacity: phase1O, position: "absolute", left: 0, right: 0, top: 8 }}>
              {/* Site badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20,
                background: `${C.green}18`, border: `1px solid ${C.green}33`,
                marginBottom: 12,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 11, color: C.green, fontFamily: C.font, fontWeight: 600 }}>Siège social</span>
              </div>

              {/* Big clock */}
              <div style={{
                fontSize: 44, fontWeight: 900, fontFamily: C.mono,
                color: C.green, textAlign: "center" as const,
                transform: `scale(${clockPulse})`,
                marginBottom: 2,
                textShadow: `0 0 30px ${C.green}66`,
              }}>
                {timeStr}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, textAlign: "center" as const, marginBottom: 18 }}>
                {dateStr}
              </div>

              {/* ARRIVÉE button */}
              <div style={{
                background: tapped ? C.greenDim : C.green,
                borderRadius: 14, padding: "15px",
                textAlign: "center" as const,
                transform: `scale(${tapScale})`,
                boxShadow: `0 8px 28px ${C.green}55`,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", fontFamily: C.font, letterSpacing: 2 }}>
                  {tapped ? "ARRIVÉE ✓" : "ARRIVÉE"}
                </div>
              </div>

              {/* History entry */}
              <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                <div style={{ fontSize: 9, color: C.muted, fontFamily: C.font, fontWeight: 600,
                  textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 6 }}>
                  Aujourd'hui
                </div>
                <div style={{ opacity: entry1O, display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: C.font }}>
                  <span style={{ color: C.green }}>● Arrivée</span>
                  <span style={{ color: C.ink }}>09:42</span>
                </div>
              </div>
            </div>

            {/* ── PHASE 2 : EN COURS + DÉPART rouge ── */}
            <div style={{ opacity: phase2O, position: "absolute", left: 0, right: 0, top: 8 }}>
              {/* EN COURS badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 12,
                background: IS_DARK ? "#1e293b" : "#f1f5f9",
                border: `1px solid ${C.line}`,
                marginBottom: 14,
                justifyContent: "center" as const,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green,
                  boxShadow: `0 0 8px ${C.green}` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: C.font, letterSpacing: 2 }}>
                  EN COURS
                </span>
              </div>

              {/* Chrono */}
              <div style={{
                fontSize: 48, fontWeight: 900, fontFamily: C.mono,
                color: C.green, textAlign: "center" as const,
                textShadow: `0 0 30px ${C.green}66`,
                marginBottom: 4,
              }}>
                {chronoStr}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, textAlign: "center" as const, marginBottom: 18 }}>
                depuis 09:42:17
              </div>

              {/* MODE */}
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.font, letterSpacing: 1.5,
                textTransform: "uppercase" as const, marginBottom: 6 }}>
                Mode
              </div>
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${C.line}`,
                background: IS_DARK ? "#1e293b" : "#f8fafc",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 13, color: C.ink, fontFamily: C.font }}>Sur site</span>
                <span style={{ color: C.muted, fontSize: 11 }}>▾</span>
              </div>

              {/* DÉPART button rouge */}
              <div style={{
                background: C.red,
                borderRadius: 14, padding: "15px",
                textAlign: "center" as const,
                boxShadow: `0 8px 28px ${C.red}55, 0 0 40px ${C.red}22`,
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", fontFamily: C.font, letterSpacing: 2 }}>
                  DÉPART ✕
                </div>
              </div>
            </div>

          </Phone>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 3 : Dashboard admin (360–540) ───────────────────────── */
const SceneAdmin: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const local = frame - 360;

  const panelS  = spr(frame, 360, fps);
  const stat1S  = spr(frame, 372, fps);
  const stat2S  = spr(frame, 384, fps);
  const stat3S  = spr(frame, 396, fps);
  const stat4S  = spr(frame, 408, fps);
  const rowS    = spr(frame, 430, fps);
  const approveS = spr(frame, 475, fps);
  const approved = local >= 125;
  const labelS  = spr(frame, 365, fps);

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 56 }}>

      {/* Label text */}
      <div style={{
        opacity: interpolate(labelS, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(labelS, [0, 1], [-50, 0])}px)`,
        maxWidth: 310,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.indigo, fontFamily: C.font,
          letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 18,
        }}>
          Côté admin
        </div>
        <div style={{
          fontSize: 42, fontWeight: 900, fontFamily: C.font, color: C.ink,
          lineHeight: 1.15, letterSpacing: -1.5, marginBottom: 18,
        }}>
          Tout sous<br />
          <span style={{ color: C.indigo }}>contrôle.</span>
        </div>
        <div style={{ fontSize: 15, color: C.muted, fontFamily: C.font, lineHeight: 1.75 }}>
          Validations, rapports, présences — centralisés en un seul dashboard.
        </div>
      </div>

      {/* Dashboard panel */}
      <div style={{
        width: 640,
        background: C.bgCard,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        padding: "30px",
        boxShadow: IS_DARK
          ? `0 0 80px rgba(0,0,0,0.6), 0 0 40px ${C.indigo}18`
          : `0 0 60px rgba(0,0,0,0.15)`,
        opacity: interpolate(panelS, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(panelS, [0, 1], [100, 0])}px)`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: C.font }}>Tableau de bord</div>
            <div style={{ fontSize: 12, color: C.muted, fontFamily: C.font }}>Samedi 9 mai 2026</div>
          </div>
          <div style={{
            padding: "6px 16px", borderRadius: 20,
            background: `${C.green}18`, border: `1px solid ${C.green}33`,
            fontSize: 13, fontWeight: 700, color: C.green, fontFamily: C.font,
          }}>
            Pointon
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 26 }}>
          {[
            { label: "Employés", val: "24", color: C.green, s: stat1S },
            { label: "Présents", val: "18", color: C.green, s: stat2S },
            { label: "En attente", val: "3", color: "#f59e0b", s: stat3S },
            { label: "Heures supp.", val: "2", color: C.red, s: stat4S },
          ].map(({ label, val, color, s }) => (
            <div key={label} style={{
              background: C.bgStat,
              border: `1px solid ${C.line}`,
              borderRadius: 14, padding: "16px 12px",
              opacity: interpolate(s, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px)`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: C.font }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Requests section */}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: C.font,
            letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 14,
          }}>
            Demandes en attente
          </div>

          {[
            { name: "Marie Dupont", type: "Congé 12–16 mai", delay: 0 },
            { name: "Thomas Klein", type: "RTT 20 mai", delay: 1 },
          ].map(({ name, type, delay }) => (
            <div key={name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 12,
              background: C.bgStat,
              border: `1px solid ${C.line}`,
              marginBottom: 8,
              opacity: interpolate(rowS, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rowS, [0, 1], [40, 0])}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `${C.indigo}25`, border: `1px solid ${C.indigo}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: C.indigo, fontFamily: C.font,
                }}>
                  {name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: C.font }}>{name}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: C.font }}>{type}</div>
                </div>
              </div>

              {delay === 0 ? (
                <div style={{
                  padding: "7px 16px", borderRadius: 8,
                  background: approved ? `${C.green}20` : `${C.indigo}20`,
                  border: `1px solid ${approved ? C.green : C.indigo}44`,
                  fontSize: 12, fontWeight: 700,
                  color: approved ? C.green : C.indigo,
                  fontFamily: C.font,
                  transform: `scale(${interpolate(approveS, [0, 1], [approved ? 0.88 : 1, 1])})`,
                  boxShadow: approved ? `0 0 16px ${C.green}33` : "none",
                }}>
                  {approved ? "✓ Approuvé" : "Approuver"}
                </div>
              ) : (
                <div style={{
                  padding: "7px 16px", borderRadius: 8,
                  background: `${C.indigo}20`,
                  border: `1px solid ${C.indigo}44`,
                  fontSize: 12, fontWeight: 700, color: C.indigo, fontFamily: C.font,
                }}>
                  Approuver
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 4 : Manager vue (540–630) ───────────────────────────── */
const SceneManager: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const local = frame - 540;
  const labelS = spr(frame, 542, fps);
  const row1S  = spr(frame, 555, fps);
  const row2S  = spr(frame, 565, fps);
  const row3S  = spr(frame, 575, fps);
  const row4S  = spr(frame, 585, fps);

  const employees = [
    { name: "Marie Dupont",  status: "Présente",  time: "08:12", color: C.green },
    { name: "Thomas Klein",  status: "Présent",   time: "08:45", color: C.green },
    { name: "Sara Leclercq", status: "Télétravail", time: "09:02", color: "#38bdf8" },
    { name: "Marc Bernard",  status: "Absent",    time: "—",     color: "#f87171" },
  ];
  const springs = [row1S, row2S, row3S, row4S];

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60 }}>

      <div style={{
        opacity: interpolate(labelS, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(labelS, [0, 1], [-50, 0])}px)`,
        maxWidth: 280,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#38bdf8", fontFamily: C.font,
          letterSpacing: 3, textTransform: "uppercase" as const, marginBottom: 18,
        }}>
          Côté manager
        </div>
        <div style={{
          fontSize: 42, fontWeight: 900, fontFamily: C.font, color: C.ink,
          lineHeight: 1.15, letterSpacing: -1.5, marginBottom: 18,
        }}>
          Votre équipe<br />
          <span style={{ color: "#38bdf8" }}>en direct.</span>
        </div>
        <div style={{ fontSize: 15, color: C.muted, fontFamily: C.font, lineHeight: 1.75 }}>
          Présences, absences, télétravail — une seule vue temps réel.
        </div>
      </div>

      {/* Presence table */}
      <div style={{
        width: 520,
        background: C.bgCard,
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        padding: "28px",
        boxShadow: IS_DARK
          ? `0 0 80px rgba(0,0,0,0.6), 0 0 40px #38bdf810`
          : `0 0 60px rgba(0,0,0,0.12)`,
        opacity: interpolate(row1S, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(row1S, [0, 1], [80, 0])}px)`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, fontFamily: C.font }}>Présences du jour</div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: C.green, fontFamily: C.font,
            padding: "4px 12px", borderRadius: 20,
            background: `${C.green}14`, border: `1px solid ${C.green}33`,
          }}>
            Live
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {employees.map(({ name, status, time, color }, i) => (
            <div key={name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              background: C.bgStat,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              opacity: interpolate(springs[i], [0, 1], [0, 1]),
              transform: `translateX(${interpolate(springs[i], [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px ${color}88`,
                }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: C.font }}>{name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 12, color, fontFamily: C.font, fontWeight: 600 }}>{status}</span>
                <span style={{ fontSize: 13, color: C.muted, fontFamily: C.mono }}>{time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Scene 5 : CTA (630–720) ────────────────────────────────────── */
const SceneCTA: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const titleS = spr(frame, 632, fps);
  const btnS   = spr(frame, 648, fps);
  const urlS   = spr(frame, 660, fps);
  const pulse  = 1 + Math.sin((frame - 630) * 0.1) * 0.025;
  const glowPulse = 1 + Math.sin((frame - 630) * 0.07) * 0.2;

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${C.green}18 0%, transparent 65%)`,
        transform: `scale(${glowPulse})`,
        filter: "blur(60px)",
      }} />

      <div style={{
        opacity: interpolate(titleS, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
        textAlign: "center" as const,
        position: "relative",
      }}>
        <div style={{ fontSize: 64, fontWeight: 900, fontFamily: C.font, color: C.ink, letterSpacing: -2.5, lineHeight: 1.1 }}>
          Commencez<br />
          <span style={{ color: C.green }}>gratuitement.</span>
        </div>
        <div style={{ fontSize: 20, color: C.muted, fontFamily: C.font, marginTop: 16 }}>
          Aucune carte bancaire · Setup en 2 minutes · 30 jours offerts
        </div>
      </div>

      <div style={{
        opacity: interpolate(btnS, [0, 1], [0, 1]),
        transform: `scale(${interpolate(btnS, [0, 1], [0.8, 1])} ) scale(${pulse})`,
        padding: "20px 64px",
        borderRadius: 20,
        background: C.green,
        color: "#fff",
        fontSize: 24, fontWeight: 800, fontFamily: C.font,
        boxShadow: `0 0 60px ${C.green}55, 0 12px 40px ${C.green}33`,
        letterSpacing: 0.3,
        position: "relative",
      }}>
        Créer mon compte →
      </div>

      <div style={{
        opacity: interpolate(urlS, [0, 1], [0, 1]),
        fontSize: 16, color: C.muted, fontFamily: C.font,
        display: "flex", alignItems: "center", gap: 12,
        position: "relative",
      }}>
        <span style={{ color: C.green, fontWeight: 700 }}>pointon.ced-it.be</span>
        <span>·</span>
        <span>Conforme Belgique 2027</span>
        <span>·</span>
        <span>RGPD</span>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Main composition ───────────────────────────────────────────── */
export const PoinconDemoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showIntro   = frame < 115;
  const showMobile  = frame >= 80  && frame < 385;
  const showAdmin   = frame >= 350 && frame < 565;
  const showManager = frame >= 530 && frame < 650;
  const showCTA     = frame >= 620;

  const oIntro   = interpolate(frame, [85,  115], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oMobile  = interpolate(frame, [80,  105, 355, 385], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oAdmin   = interpolate(frame, [350, 375, 535, 565], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oManager = interpolate(frame, [530, 555, 620, 650], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oCTA     = interpolate(frame, [620, 645], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: C.font, overflow: "hidden" }}>
      <Bg frame={frame} />

      {showIntro && (
        <div style={{ position: "absolute", inset: 0, opacity: oIntro }}>
          <SceneIntro frame={frame} fps={fps} />
        </div>
      )}
      {showMobile && (
        <div style={{ position: "absolute", inset: 0, opacity: oMobile }}>
          <SceneMobile frame={frame} fps={fps} />
        </div>
      )}
      {showAdmin && (
        <div style={{ position: "absolute", inset: 0, opacity: oAdmin }}>
          <SceneAdmin frame={frame} fps={fps} />
        </div>
      )}
      {showManager && (
        <div style={{ position: "absolute", inset: 0, opacity: oManager }}>
          <SceneManager frame={frame} fps={fps} />
        </div>
      )}
      {showCTA && (
        <div style={{ position: "absolute", inset: 0, opacity: oCTA }}>
          <SceneCTA frame={frame} fps={fps} />
        </div>
      )}
    </AbsoluteFill>
  );
};

export default PoinconDemoVideo;
