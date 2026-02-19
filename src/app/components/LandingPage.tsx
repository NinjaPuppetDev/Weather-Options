'use client';

import { useState, useEffect, useRef, ReactNode, CSSProperties } from "react";

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

interface RevealProps { children: ReactNode; delay?: number; className?: string; }
function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(32px)", transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s` }}>
      {children}
    </div>
  );
}

const RESPONSIVE = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  ::selection { background: rgba(201,145,61,0.25); }

  @keyframes floatRain {
    0%,100% { transform: translateY(0px) rotate(-5deg); }
    50% { transform: translateY(-12px) rotate(-5deg); }
  }
  @keyframes pulseGold {
    0%,100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  .rain-float { animation: floatRain 4s ease-in-out infinite; }
  .pulse-dot { animation: pulseGold 2s ease-in-out infinite; }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(28,43,30,0.15); }
  .product-card:hover { background: rgba(244,237,224,0.06) !important; }

  /* ── Section padding ── */
  .lp-section { padding: 7rem 2.5rem; }
  .lp-section-narrow { max-width: 760px; margin: 0 auto; }
  .lp-section-wide { max-width: 1200px; margin: 0 auto; }

  /* ── Grids ── */
  .lp-origin-grid {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 6rem; align-items: center;
  }
  .lp-stat-grid {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
  }
  .lp-how-steps { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
  .lp-how-step {
    display: grid; grid-template-columns: 80px 1fr 1fr;
    align-items: center; padding: 2.5rem 0;
    border-top: 1px solid rgba(28,43,30,0.12); gap: 3rem;
  }
  .lp-how-header {
    max-width: 1100px; margin: 0 auto 5rem;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .lp-product-grid {
    max-width: 1100px; margin: 3.5rem auto 0;
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
  }
  .lp-tech-grid {
    max-width: 1100px; margin: 3.5rem auto 0;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;
  }
  .lp-about-grid {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;
  }
  .lp-about-image-area { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .lp-nav-links { display: flex; gap: 2.5rem; align-items: center; }
  .lp-nav-link { font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase; color: #4a5c4b; text-decoration: none; cursor: pointer; }
  .lp-scroll-indicator { display: flex; }
  .lp-product-note {
    max-width: 1100px; margin: 2px auto 0;
    padding: 2.5rem 3rem; background: rgba(244,237,224,0.03);
    border: 1px solid rgba(244,237,224,0.07); border-top: none;
    display: flex; gap: 4rem; align-items: center;
  }

  /* ── Tablet ── */
  @media (max-width: 900px) {
    .lp-section { padding: 5rem 1.5rem; }
    .lp-origin-grid { grid-template-columns: 1fr; gap: 3rem; }
    .lp-stat-grid { grid-template-columns: 1fr; gap: 2px; }
    .lp-how-step { grid-template-columns: 60px 1fr; gap: 1.5rem; }
    .lp-how-step-meta { display: none; }
    .lp-how-header { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 3rem; }
    .lp-product-grid { grid-template-columns: 1fr; }
    .lp-tech-grid { grid-template-columns: repeat(2, 1fr); }
    .lp-about-grid { grid-template-columns: 1fr; gap: 3rem; }
    .lp-about-image-area { grid-template-columns: 1fr 1fr; }
    .lp-product-note { flex-direction: column; gap: 1.5rem; padding: 2rem; }
    .lp-nav-links { gap: 1.25rem; }
  }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    .lp-section { padding: 4rem 1.25rem; }
    .lp-nav-links .lp-nav-link { display: none; }
    .lp-scroll-indicator { display: none; }
    .lp-tech-grid { grid-template-columns: 1fr; }
    .lp-how-step { grid-template-columns: 1fr; gap: 0.75rem; padding: 1.75rem 0; }
    .lp-how-step-num { font-size: 1.5rem !important; }
    .lp-about-image-area { grid-template-columns: 1fr; }
    .lp-product-note { padding: 1.5rem; gap: 1rem; }
    .lp-stat-grid { gap: 1px; }
  }
`;

const S: Record<string, CSSProperties> = {
  root: { fontFamily: "'Cormorant Garamond', Georgia, serif", background: "#f4ede0", color: "#1c2b1e", overflowX: "hidden", lineHeight: 1.6 },
  nav: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 2.5rem", background: "rgba(244,237,224,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(28,43,30,0.08)" },
  navLogo: { fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1c2b1e" },
  navCta: { fontSize: "0.78rem", letterSpacing: "0.15em", textTransform: "uppercase", background: "#1c2b1e", color: "#f4ede0", border: "none", padding: "0.65rem 1.4rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  hero: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 2.5rem 5rem", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #1c2b1e 0%, #2d4a30 45%, #3d5c35 100%)" },
  heroBg: { position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 20% 80%, rgba(201,145,61,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,168,181,0.12) 0%, transparent 50%)` },
  heroNoise: { position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "200px" },
  heroLabel: { fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#c9913d", marginBottom: "1.25rem", position: "relative" },
  heroTitle: { fontSize: "clamp(2.8rem, 9vw, 8rem)", fontWeight: 400, lineHeight: 0.95, color: "#f4ede0", marginBottom: "2rem", position: "relative", letterSpacing: "-0.01em" },
  heroSub: { maxWidth: "520px", fontSize: "clamp(1rem, 2vw, 1.2rem)", fontWeight: 300, color: "rgba(244,237,224,0.72)", marginBottom: "3rem", position: "relative", lineHeight: 1.7 },
  heroActions: { display: "flex", gap: "1rem", alignItems: "center", position: "relative", flexWrap: "wrap" },
  heroPrimaryBtn: { background: "#c9913d", color: "#1c2b1e", border: "none", padding: "1rem 2.2rem", fontSize: "0.82rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.2s, box-shadow 0.2s" },
  heroSecBtn: { background: "transparent", color: "rgba(244,237,224,0.8)", border: "1px solid rgba(244,237,224,0.3)", padding: "1rem 2.2rem", fontSize: "0.82rem", letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.2s" },
  heroScroll: { position: "absolute", right: "2.5rem", bottom: "5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(244,237,224,0.4)", writingMode: "vertical-rl" },
  heroScrollLine: { width: "1px", height: "60px", background: "linear-gradient(to bottom, rgba(244,237,224,0.4), transparent)" },
  label: { fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#c9913d", marginBottom: "1rem", display: "block" },
  originSection: { background: "#f4ede0", borderBottom: "1px solid rgba(28,43,30,0.1)" },
  originQuote: { fontSize: "clamp(1.3rem, 3vw, 2.4rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.5, color: "#1c2b1e", borderLeft: "3px solid #c9913d", paddingLeft: "2rem", marginBottom: "2rem" },
  originAttrib: { fontSize: "0.85rem", color: "#6b6560", letterSpacing: "0.1em" },
  originImagePlaceholder: { aspectRatio: "4/5", background: "linear-gradient(145deg, #2d4a30, #1c2b1e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", border: "1px solid rgba(28,43,30,0.15)" },
  originImageText: { color: "rgba(244,237,224,0.4)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase" },
  problemSection: { background: "#1c2b1e" },
  statCard: { padding: "3rem 2.5rem", background: "rgba(244,237,224,0.04)", borderLeft: "1px solid rgba(244,237,224,0.06)" },
  statNum: { fontSize: "clamp(2.2rem, 5vw, 4.5rem)", fontWeight: 300, color: "#c9913d", lineHeight: 1, marginBottom: "0.75rem", letterSpacing: "-0.02em", fontFamily: "'DM Mono', monospace", },
  statDesc: { fontSize: "0.95rem", color: "rgba(244,237,224,0.6)", lineHeight: 1.65 },
  howSection: { background: "#f4ede0", borderTop: "1px solid rgba(28,43,30,0.08)", borderBottom: "1px solid rgba(28,43,30,0.08)" },
  howTitle: { fontSize: "clamp(1.6rem, 4vw, 3.2rem)", fontWeight: 400, lineHeight: 1.15, maxWidth: "480px" },
  howNum: { fontSize: "clamp(1.5rem, 3vw, 3rem)", fontWeight: 300, color: "#c9913d", fontStyle: "italic" },
  howStepTitle: { fontSize: "1.25rem", fontWeight: 500, marginBottom: "0.5rem" },
  howStepDesc: { fontSize: "0.95rem", color: "#4a5c4b", lineHeight: 1.7 },
  howStepMeta: { fontSize: "0.8rem", color: "#6b6560", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace", textAlign: "right", alignSelf: "flex-start", paddingTop: "0.25rem" },
  productsSection: { background: "#1c2b1e" },
  productCard: { padding: "3.5rem", background: "rgba(244,237,224,0.03)", border: "1px solid rgba(244,237,224,0.07)", transition: "background 0.3s" },
  productIcon: { fontSize: "2.5rem", marginBottom: "1.75rem" },
  productType: { fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#c9913d", marginBottom: "0.75rem" },
  productTitle: { fontSize: "1.75rem", fontWeight: 400, color: "#f4ede0", marginBottom: "1rem" },
  productDesc: { fontSize: "0.95rem", color: "rgba(244,237,224,0.6)", lineHeight: 1.75, marginBottom: "2rem" },
  productExample: { background: "rgba(201,145,61,0.08)", border: "1px solid rgba(201,145,61,0.2)", padding: "1.25rem 1.5rem" },
  productExampleLabel: { fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#c9913d", marginBottom: "0.5rem" },
  productExampleText: { fontSize: "0.9rem", color: "rgba(244,237,224,0.75)", fontStyle: "italic", lineHeight: 1.6 },
  techSection: { background: "#f4ede0", borderTop: "1px solid rgba(28,43,30,0.08)" },
  techCard: { padding: "2.75rem 2.25rem", background: "white", border: "1px solid rgba(28,43,30,0.08)", borderBottom: "3px solid #c9913d" },
  techCardTitle: { fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#1c2b1e" },
  techCardDesc: { fontSize: "0.92rem", color: "#4a5c4b", lineHeight: 1.7 },
  techCardTag: { display: "inline-block", marginTop: "1.25rem", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#c9913d", borderTop: "1px solid #c9913d", paddingTop: "0.4rem" },
  aboutSection: { background: "#2d4a30" },
  aboutImgPlaceholder: { background: "rgba(244,237,224,0.06)", border: "1px solid rgba(244,237,224,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "1rem" },
  aboutImgText: { fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(244,237,224,0.3)", textAlign: "center" },
  aboutTitle: { fontSize: "clamp(1.6rem, 3.5vw, 3rem)", fontWeight: 400, color: "#f4ede0", lineHeight: 1.2, marginBottom: "1.5rem" },
  aboutBody: { fontSize: "1rem", color: "rgba(244,237,224,0.65)", lineHeight: 1.8, marginBottom: "1.5rem" },
  aboutName: { fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#c9913d", marginTop: "2rem" },
  aboutRole: { fontSize: "0.8rem", color: "rgba(244,237,224,0.4)", marginTop: "0.25rem" },
  ctaSection: { background: "#f4ede0", borderTop: "1px solid rgba(28,43,30,0.08)", textAlign: "center" },
  ctaTitle: { fontSize: "clamp(2rem, 6vw, 5rem)", fontWeight: 400, lineHeight: 1.1, marginBottom: "1.75rem", maxWidth: "700px", margin: "0 auto 1.75rem" },
  ctaSub: { fontSize: "1.1rem", color: "#4a5c4b", maxWidth: "480px", margin: "0 auto 3rem", lineHeight: 1.7 },
  ctaBtn: { background: "#1c2b1e", color: "#f4ede0", border: "none", padding: "1.1rem 3rem", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.2s, box-shadow 0.2s" },
  footer: { background: "#1c2b1e", padding: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(244,237,224,0.06)", flexWrap: "wrap", gap: "0.75rem" },
  footerLeft: { fontSize: "0.8rem", color: "rgba(244,237,224,0.35)", letterSpacing: "0.12em" },
  footerRight: { fontSize: "0.75rem", color: "rgba(244,237,224,0.25)", letterSpacing: "0.1em" },
  divider: { width: "40px", height: "1px", background: "#c9913d", margin: "1.5rem 0" },
};

interface RainDropProps { style?: CSSProperties; }
function RainDrop({ style }: RainDropProps) {
  return (
    <svg viewBox="0 0 24 36" fill="none" style={{ width: 16, ...style }}>
      <path d="M12 2 C12 2, 2 16, 2 22 C2 28.627 6.477 34 12 34 C17.523 34 22 28.627 22 22 C22 16 12 2 12 2Z" stroke="rgba(201,145,61,0.5)" strokeWidth="1" fill="rgba(201,145,61,0.08)" />
    </svg>
  );
}

function ChainlinkBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#375bd2", background: "rgba(55,91,210,0.08)", border: "1px solid rgba(55,91,210,0.2)", padding: "0.35rem 0.85rem" }}>
      ⛓ Powered by Chainlink
    </span>
  );
}

interface ImgPlaceholderProps { label: string; aspect?: string; }
function ImgPlaceholder({ label, aspect = "4/5" }: ImgPlaceholderProps) {
  return (
    <div style={{ ...S.originImagePlaceholder, aspectRatio: aspect }}>
      <RainDrop />
      <span style={S.originImageText}>{label}</span>
    </div>
  );
}

interface LandingPageProps { onStart: () => void; }
export default function LandingPage({ onStart }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <style>{RESPONSIVE}</style>
      <div style={S.root}>

        {/* NAV */}
        <nav style={{ ...S.nav, boxShadow: scrolled ? "0 2px 20px rgba(28,43,30,0.08)" : "none", transition: "box-shadow 0.3s" }}>
          <span style={S.navLogo}>Bruma Protocol</span>
          <div className="lp-nav-links">
            <span className="lp-nav-link" onClick={() => scrollTo("how-it-works")}>How it works</span>
            <span className="lp-nav-link" onClick={() => scrollTo("products")}>Products</span>
            <span className="lp-nav-link" onClick={() => scrollTo("technology")}>Technology</span>
            <span className="lp-nav-link" onClick={() => scrollTo("about")}>About</span>
            <button style={S.navCta} className="hover-lift" onClick={onStart}>
              Start Protecting →
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ ...S.hero, padding: "0 clamp(1.25rem, 5vw, 4rem) clamp(3rem, 8vh, 6rem)" }}>
          <div style={S.heroBg} />
          <div style={S.heroNoise} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rain-float lp-scroll-indicator" style={{ position: "absolute", right: `${15 + i * 8}%`, top: `${20 + (i % 3) * 18}%`, animationDelay: `${i * 0.7}s`, opacity: 0.6 - i * 0.1 }}>
              <RainDrop style={{ width: 12 + i * 4 }} />
            </div>
          ))}
          <div style={{ position: "relative", marginBottom: "2.5rem" }}>
            <ChainlinkBadge />
          </div>
          <p style={S.heroLabel}>Medellín · Parametric Rainfall Protection · On-Chain</p>
          <h1 style={S.heroTitle}>
            Hedge the sky.<br />
            <em>Protect what's</em><br />
            yours.
          </h1>
          <p style={S.heroSub}>
            Rain decides harvests, events, revenue, and risk.
            Until now, small and mid-sized operators had no direct way to hedge it.
            Bruma Protocol transforms rainfall uncertainty into a structured financial position — priced transparently, settled automatically.
          </p>
          <div style={S.heroActions}>
            <button style={S.heroPrimaryBtn} className="hover-lift" onClick={onStart}>
              Start Protecting →
            </button>
            <button style={S.heroSecBtn} onClick={() => scrollTo("how-it-works")}>
              Learn more
            </button>
          </div>
          <div className="lp-scroll-indicator" style={S.heroScroll}>
            <div style={S.heroScrollLine} />
            Scroll
          </div>
        </section>

        {/* ORIGIN STORY */}
        <section style={{ ...S.originSection }} className="lp-section">
          <div className="lp-origin-grid">
            <Reveal>
              <span style={S.label}>The Story Behind It</span>
              <blockquote style={S.originQuote}>
                "She checked the weather every single morning. Not as a ritual, but as a necessity."
              </blockquote>
              <p style={{ fontSize: "1rem", color: "#4a5c4b", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                The idea was born in a conversation with a woman in Medellín who owns both a business
                and a recreational farm. Every day began with the same act: looking at the sky, reading
                the forecast, calculating risk. Not from anxiety, but from deep, earned knowledge that
                weather is not background noise — it is the protagonist of any outdoor endeavor.
              </p>
              <p style={{ fontSize: "1rem", color: "#4a5c4b", lineHeight: 1.8, marginBottom: "2rem" }}>
                What if that daily ritual could be transformed into a financial hedge? What if the sky's
                unpredictability could be priced, managed, and settled automatically — on-chain,
                transparently, without intermediaries?
              </p>
              <div style={S.divider} />
              <p style={S.originAttrib}>Bruma Pro · Built in Medellín, Colombia · 2026</p>
            </Reveal>
            <Reveal delay={0.2}>
              <img src="/farmstory.png" alt="The farm, the landscape, the story" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
            </Reveal>
          </div>
        </section>

        {/* PROBLEM / STATS */}
        <section style={{ ...S.problemSection }} className="lp-section">
          <div style={{ maxWidth: "1100px", margin: "0 auto 3.5rem" }}>
            <Reveal>
              <span style={{ ...S.label, color: "rgba(201,145,61,0.8)" }}>The Risk Is Real</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)", fontWeight: 400, color: "#f4ede0", maxWidth: "560px", lineHeight: 1.25 }}>
                Weather is the oldest, most underpriced risk in business.
              </h2>
            </Reveal>
          </div>
          <div className="lp-stat-grid">
            {[
              { num: "30%", desc: "of agricultural losses in Latin America are attributed to unexpected rainfall variation each year." },
              { num: "1 in 3", desc: "outdoor businesses in Colombia report significant revenue impact from unplanned weather events." },
              { num: "0", desc: "accessible hedging tools existed for small and mid-sized farms or businesses — until now." },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div style={S.statCard}>
                  <div style={S.statNum}>{s.num}</div>
                  <p style={S.statDesc}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ ...S.howSection }} className="lp-section" id="how-it-works">
          <div className="lp-how-header">
            <Reveal>
              <span style={S.label}>Process</span>
              <h2 style={S.howTitle}>Four steps from exposure to protection</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ fontSize: "0.9rem", color: "#6b6560", maxWidth: "280px", lineHeight: 1.7, textAlign: "right" }}>
                Fully automated via Chainlink Functions & Automation. No intermediaries. No manual claims.
              </p>
            </Reveal>
          </div>
          <div className="lp-how-steps">
            {[
              { num: "01", title: "Choose your parameters", desc: "Select your location (latitude & longitude), observation window, strike rainfall in millimeters, and the spread — the range over which your payout scales. Choose Call (protect against excess rain) or Put (protect against drought).", meta: "Location · Strike · Spread · Option Type" },
              { num: "02", title: "Receive a Chainlink-priced quote", desc: "Our smart contract calls Chainlink Functions to compute a fair premium using 10 years of historical rainfall data for your specific coordinates. The quote is valid for 1 hour, giving you time to decide without rushing.", meta: "Chainlink Functions · Historical Data · Dynamic Pricing" },
              { num: "03", title: "Pay the premium, mint your option", desc: "Your option is minted as an ERC-721 NFT, giving you full ownership and transferability. Collateral is locked in the ERC-4626 vault at an 80% maximum utilization rate, ensuring the protocol always has the capital to pay out.", meta: "ERC-721 NFT · ERC-4626 Vault · Collateral Locked" },
              { num: "04", title: "Settlement happens automatically", desc: "At expiry, Chainlink Automation triggers settlement — fetching real rainfall data for your observation window via a trusted oracle. If your conditions are met, WETH is transferred to you without you lifting a finger.", meta: "Chainlink Automation · Oracle Settlement · Auto Payout" },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="lp-how-step">
                  <div className="lp-how-step-num" style={S.howNum}>{step.num}</div>
                  <div>
                    <div style={S.howStepTitle}>{step.title}</div>
                    <p style={S.howStepDesc}>{step.desc}</p>
                  </div>
                  <div className="lp-how-step-meta" style={S.howStepMeta}>
                    {step.meta.split(" · ").map((tag, j) => (
                      <div key={j} style={{ marginBottom: "0.35rem" }}>· {tag}</div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PRODUCTS */}
        <section style={{ ...S.productsSection }} className="lp-section" id="products">
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <Reveal>
              <span style={{ ...S.label, color: "rgba(201,145,61,0.8)" }}>Products</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)", fontWeight: 400, color: "#f4ede0", marginBottom: "0.5rem" }}>
                Two instruments, infinite use cases.
              </h2>
            </Reveal>
          </div>
          <div className="lp-product-grid">
            <Reveal delay={0.1}>
              <div style={S.productCard} className="product-card">
                <div style={S.productIcon}>🌧</div>
                <div style={S.productType}>Call Option</div>
                <div style={S.productTitle}>Too much rain</div>
                <p style={S.productDesc}>A Call Option pays out when actual rainfall <em>exceeds</em> your strike level. The payout scales linearly from the strike up to your defined spread, capped at the maximum notional. Ideal for event spaces, hospitality venues, outdoor concerts, or harvest operations vulnerable to flooding.</p>
                <div style={S.productExample}>
                  <div style={S.productExampleLabel}>Example scenario</div>
                  <p style={S.productExampleText}>A coffee farm near Jardín sets a Call at 120mm/month. If January receives 180mm, the option pays proportionally — offsetting the damage to exposed crops.</p>
                </div>
                <div style={{ marginTop: "1.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "rgba(244,237,224,0.35)", lineHeight: 1.8 }}>
                  <div>Payout = min(actual − strike, spread) × notional</div>
                  <div>Triggers when: actual &gt; strike</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={S.productCard} className="product-card">
                <div style={S.productIcon}>☀️</div>
                <div style={S.productType}>Put Option</div>
                <div style={S.productTitle}>Too little rain</div>
                <p style={S.productDesc}>A Put Option pays out when actual rainfall <em>falls below</em> your strike level. Perfect for farmers who depend on consistent rainfall for irrigation, or tour operators whose business peaks when weather is dry but need protection during drought-impacted slow seasons.</p>
                <div style={S.productExample}>
                  <div style={S.productExampleLabel}>Example scenario</div>
                  <p style={S.productExampleText}>A recreational finca sets a Put at 60mm/quarter. A dry season with only 20mm triggers a payout, helping cover the cost of water trucking and crop loss.</p>
                </div>
                <div style={{ marginTop: "1.75rem", fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "rgba(244,237,224,0.35)", lineHeight: 1.8 }}>
                  <div>Payout = min(strike − actual, spread) × notional</div>
                  <div>Triggers when: actual &lt; strike</div>
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.3}>
            <div className="lp-product-note">
              <div>
                <div style={S.productType}>Liquidity Pool</div>
                <div style={{ fontSize: "1.2rem", color: "#f4ede0", fontWeight: 400 }}>Earn as a risk underwriter</div>
              </div>
              <p style={{ fontSize: "0.95rem", color: "rgba(244,237,224,0.55)", lineHeight: 1.75, maxWidth: "560px" }}>
                Deposit WETH into the ERC-4626 vault to back Bruma Protocol. Earn a share of every premium collected. The vault enforces an 80% maximum utilization rate and a 20% per-location exposure cap, keeping liquidity providers protected from correlated risk.
              </p>
            </div>
          </Reveal>
        </section>

        {/* TECHNOLOGY */}
        <section style={{ ...S.techSection }} className="lp-section" id="technology">
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <Reveal>
              <span style={S.label}>Architecture</span>
              <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)", fontWeight: 400, lineHeight: 1.2 }}>
                Built on verifiable,<br />decentralized infrastructure.
              </h2>
            </Reveal>
          </div>
          <div className="lp-tech-grid">
            {[
              { title: "Chainlink Functions", desc: "Premium pricing and rainfall settlement both use Chainlink Functions to fetch and verify real-world data on-chain. The oracle network ensures no single party can manipulate the outcome.", tag: "Oracle Layer" },
              { title: "Chainlink Automation", desc: "Settlement is fully automated. Chainlink Keepers monitor option expiry and trigger the settlement flow — including auto-claiming payouts — without any manual intervention.", tag: "Automation Layer" },
              { title: "ERC-721 Option NFTs", desc: "Each option is a transferable NFT, giving you full ownership. Transfers are locked during the settlement window to prevent front-running. Your option is a financial instrument — on-chain.", tag: "Asset Layer" },
              { title: "ERC-4626 Vault", desc: "Liquidity is managed via a standard vault with virtual share offset (inflation attack protection). Up to 80% of TVL can back active options, with per-location exposure capped at 20%.", tag: "Liquidity Layer" },
              { title: "Two-Step Option Creation", desc: "A quote request precedes option creation. Quotes are valid for 1 hour. This design prevents stale pricing and ensures premiums reflect real conditions at purchase time.", tag: "UX Safety" },
              { title: "Pull Payment Pattern", desc: "Payouts follow the pull-payment pattern (CEI) — protecting against malicious contracts attempting to block settlements. If auto-claim fails, you can always claim manually.", tag: "Security" },
            ].map((tech, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div style={S.techCard}>
                  <div style={S.techCardTitle}>{tech.title}</div>
                  <p style={S.techCardDesc}>{tech.desc}</p>
                  <div style={S.techCardTag}>{tech.tag}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <div style={{ maxWidth: "1100px", margin: "2.5rem auto 0", padding: "1.5rem 2rem", background: "white", border: "1px solid rgba(28,43,30,0.08)", display: "flex", gap: "3rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#6b6560" }}>Deployed on</span>
              {["Ethereum Sepolia Testnet", "Bruma.sol", "BrumaVault.sol"].map((c, i) => (
                <span key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: "#1c2b1e" }}>{c}</span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ABOUT */}
        <section style={{ ...S.aboutSection }} className="lp-section" id="about">
          <div className="lp-about-grid">
            <Reveal>
              <div className="lp-about-image-area">
                <div style={{ gridColumn: "1 / -1" }}>
                  <img src="/myphoto.png" alt="David Raigoza" style={{ width: "100%", aspectRatio: "16/7", objectFit: "cover", display: "block" }} />

                </div>
                <img src="/cityphoto.png" alt="Medellín" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />

                <img src="/medellin.png" alt="Farm and nature" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />

              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <span style={{ ...S.label, color: "rgba(201,145,61,0.8)" }}>The Builder</span>
              <h2 style={S.aboutTitle}>David Raigoza Product Designer Engineer.</h2>
              <p style={S.aboutBody}>Bruma Protocol was conceived, designed, and built by a single person over an intense sprint — with a little help from AI companions. The project sits at the intersection of product design, financial engineering, and a genuine desire to build tools that matter to people outside the crypto native world.</p>
              <p style={S.aboutBody}>The aesthetic and architectural philosophy guiding this project is the same as the origin story: nature-contained, considered, and built to endure. Structures that breathe with the environment rather than fight it.</p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
                {["You", "Claude — AI Architect", "ChatGPT — UI Muse", "Copilot — Code Companion"].map((m, i) => (
                  <div key={i} style={{ padding: "0.5rem 1rem", border: "1px solid rgba(244,237,224,0.12)", fontSize: "0.78rem", color: "rgba(244,237,224,0.5)", letterSpacing: "0.08em" }}>{m}</div>
                ))}
              </div>
              <div style={S.divider} />
              <div style={S.aboutName}>David Raigoza</div>
              <div style={S.aboutRole}>Product Designer & Engineer · MFA · Medellín, Colombia</div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section style={{ ...S.ctaSection }} className="lp-section">
          <Reveal>
            <span style={S.label}>Get Started</span>
            <h2 style={S.ctaTitle}>
              The sky will do<br />what it does.<br />
              <em>You decide your exposure.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={S.ctaSub}>
              Create your first weather option in minutes. No counterparty to negotiate with.
              No insurance bureaucracy. Just you, the oracle, and the rain.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <button style={S.ctaBtn} className="hover-lift" onClick={onStart}>Start Protecting →</button>
          </Reveal>
          <Reveal delay={0.35}>
            <p style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#8a9e8b", letterSpacing: "0.1em" }}>
              Built for the Chainlink Convergence · Medellín 2026
            </p>
          </Reveal>
        </section>

        {/* FOOTER */}
        <footer style={S.footer}>
          <span style={S.footerLeft}>© 2026 Bruma Protocol · David Raigoza · Medellín, Colombia</span>
          <span style={S.footerRight}>Chainlink Convergence · All on-chain</span>
        </footer>

      </div>
    </>
  );
}