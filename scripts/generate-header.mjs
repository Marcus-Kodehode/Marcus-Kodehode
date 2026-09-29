// =============================================================================
//  Profil-header — animert SVG i Børresen Digital-stil
// -----------------------------------------------------------------------------
//  Blueprint-rutenett, kattemerket (Siam), navn og en terminal som skriver.
//  Samme farger og skrift (Geist) som borresendigital.no. Skriftene bygges inn
//  som data-URL, fordi GitHub viser SVG som bilde og ikke henter noe utenfra.
//
//  node scripts/generate-header.mjs   → assets/header-dark.svg, header-light.svg
// =============================================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";

const W = 1200;
const H = 340;

const TEMA = {
  dark: {
    bg: "#0e0e11",
    panel: "#17171b",
    fg: "#e8e8e6",
    muted: "#9a9aa2",
    border: "#2a2a30",
    grid: "rgba(232,232,230,0.045)",
    accent: "#35d0e8",
  },
  light: {
    bg: "#f1f1f1",
    panel: "#e7e7e9",
    fg: "#1a1a1e",
    muted: "#55555c",
    border: "#d2d2d6",
    grid: "rgba(26,26,30,0.05)",
    accent: "#0d6b85",
  },
};

// Terminalen: kommando og svar, i rekkefølge
const LINJER = [
  { cmd: "whoami" },
  { out: "Marcus Børresen · full-stack · Sande, Vestfold" },
  { cmd: "cat nå.txt" },
  { out: "Børresen Digital: nettsider, booking, webapper" },
  { cmd: "ls stack/" },
  { out: "next.js  typescript  laravel  cloudflare  d1" },
];

async function font(fil) {
  const b = await readFile(new URL(`../assets/fonts/${fil}`, import.meta.url));
  return `data:font/woff2;base64,${b.toString("base64")}`;
}

function esc(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Monolinje-katten fra nettsiden (src/components/brand/cat-mark.tsx)
function katt(x, y, size, farge) {
  const s = size / 64;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${farge}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M15 14 L23 25 C27 22.5 37 22.5 41 25 L49 14 L51 31 C52 43 44 53 32 53 C20 53 12 43 13 31 Z"/>
<path d="M25 28.5 L27.5 24.5 L30 28 M34 28 L36.5 24.5 L39 28.5" stroke-width="1.5"/>
<path d="M20.5 35 C22.5 32.2 28 32.2 30 35 C28 37.8 22.5 37.8 20.5 35 Z"/>
<path d="M34 35 C36 32.2 41.5 32.2 43.5 35 C41.5 37.8 36 37.8 34 35 Z"/>
<path d="M25.25 33.5 V36.5 M38.75 33.5 V36.5" stroke-width="1.5"/>
<path d="M29.5 41.5 H34.5 L32 44.5 Z"/>
<path d="M32 44.5 V46.5 M32 46.5 C30 48.5 28.2 48 27.6 47 M32 46.5 C34 48.5 35.8 48 36.4 47" stroke-width="1.5"/>
<path d="M23 43 L9 41 M23 45 L8 46 M23 47 L10 51 M41 43 L55 41 M41 45 L56 46 M41 47 L54 51" stroke-width="1.5"/>
</g>`;
}

function svg(t, fonts) {
  // Terminalpanel til høyre
  const tx = 610;
  const ty = 60;
  const tw = 530;
  const th = 220;
  const linjeH = 26;
  const start = 0.6; // sekunder før første linje
  const steg = 0.9; // sekunder mellom linjer

  const linjer = LINJER.map((l, i) => {
    const y = ty + 62 + i * linjeH;
    const delay = (start + i * steg).toFixed(2);
    const tekst = l.cmd
      ? `<tspan fill="${t.accent}">$</tspan> <tspan fill="${t.fg}">${esc(l.cmd)}</tspan>`
      : `<tspan fill="${t.muted}">${esc(l.out)}</tspan>`;
    return `<text class="linje" style="animation-delay:${delay}s" x="${tx + 22}" y="${y}" font-family="GeistMono" font-size="15">${tekst}</text>`;
  }).join("\n");

  const markorY = ty + 62 + LINJER.length * linjeH - 13;
  const markorDelay = (start + LINJER.length * steg).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="tittel beskrivelse">
<title id="tittel">Marcus Børresen — Børresen Digital</title>
<desc id="beskrivelse">Full-stack-utvikler fra Sande i Vestfold. Driver Børresen Digital: nettsider, booking og webapper.</desc>
<defs>
<style>
@font-face{font-family:GeistSans;font-weight:600;src:url(${fonts.sans}) format("woff2");}
@font-face{font-family:GeistMono;font-weight:400;src:url(${fonts.mono}) format("woff2");}
.linje{opacity:0;animation:vis .35s ease-out forwards;}
.markor{opacity:0;animation:vis .1s linear ${markorDelay}s forwards, blink 1.1s steps(1) ${markorDelay}s infinite;}
.glod{animation:puls 6s ease-in-out infinite;}
@keyframes vis{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes blink{50%{opacity:0}}
@keyframes puls{50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){.linje,.markor{animation:none;opacity:1}.glod{animation:none}}
</style>
<pattern id="rute" width="32" height="32" patternUnits="userSpaceOnUse">
<path d="M32 0H0V32" fill="none" stroke="${t.grid}" stroke-width="1"/>
</pattern>
<radialGradient id="lys" cx="0.18" cy="0.35" r="0.6">
<stop offset="0" stop-color="${t.accent}" stop-opacity="0.16"/>
<stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="${W}" height="${H}" rx="14" fill="${t.bg}"/>
<rect width="${W}" height="${H}" rx="14" fill="url(#rute)"/>
<rect class="glod" width="${W}" height="${H}" rx="14" fill="url(#lys)"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="none" stroke="${t.border}"/>

<!-- hjørnemerker -->
<path d="M24 44V24H44 M${W - 44} 24H${W - 24}V44 M24 ${H - 44}V${H - 24}H44 M${W - 44} ${H - 24}H${W - 24}V${H - 44}" fill="none" stroke="${t.accent}" stroke-opacity="0.5"/>

${katt(58, 70, 92, t.accent)}

<text x="60" y="206" font-family="GeistSans" font-weight="600" font-size="46" fill="${t.fg}" letter-spacing="-1">Marcus Børresen</text>
<text x="62" y="240" font-family="GeistMono" font-size="16" fill="${t.muted}"><tspan fill="${t.accent}"># </tspan>full-stack-utvikler · Børresen Digital</text>
<text x="62" y="282" font-family="GeistMono" font-size="14" fill="${t.muted}">borresendigital.no</text>

<!-- terminal -->
<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="10" fill="${t.panel}" stroke="${t.border}"/>
<path d="M${tx} ${ty + 34}H${tx + tw}" stroke="${t.border}"/>
<circle cx="${tx + 20}" cy="${ty + 17}" r="5" fill="${t.border}"/>
<circle cx="${tx + 38}" cy="${ty + 17}" r="5" fill="${t.border}"/>
<circle cx="${tx + 56}" cy="${ty + 17}" r="5" fill="${t.border}"/>
<text x="${tx + tw / 2}" y="${ty + 22}" text-anchor="middle" font-family="GeistMono" font-size="12" fill="${t.muted}">marcus@borresen-digital: ~</text>
${linjer}
<rect class="markor" x="${tx + 22}" y="${markorY}" width="9" height="17" fill="${t.accent}"/>
</svg>
`;
}

const fonts = {
  sans: await font("geist-sans-600.woff2"),
  mono: await font("geist-mono-400.woff2"),
};
await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
for (const [navn, t] of Object.entries(TEMA)) {
  const ut = new URL(`../assets/header-${navn}.svg`, import.meta.url);
  await writeFile(ut, svg(t, fonts));
  console.log(ut.pathname);
}
