// =============================================================================
//  MoBo Stats — self-hosted GitHub stats card generator
// -----------------------------------------------------------------------------
//  Henter data via GitHub GraphQL og rendrer to SVG-kort som committes til
//  repoet. Dermed er statistikken alltid oppe — ingen tredjeparts-instanser som
//  kan rate-limite eller gå ned. Kjøres av .github/workflows/stats.yml.
//
//  Lokalt:  GITHUB_TOKEN=$(gh auth token) node scripts/generate-stats.mjs
// =============================================================================

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const USER = process.env.STATS_USER || "Marcus-Kodehode";
const TOKEN = process.env.GITHUB_TOKEN;
const OUT_STATS = "main/assets/mobo-stats.svg";
const OUT_LANGS = "main/assets/mobo-langs.svg";

// --- Tema (matcher README) ---------------------------------------------------
const C = {
  bg: "#0d1117",
  card: "#0d1117",
  border: "#1f2733",
  text: "#c9d1d9",
  muted: "#8b949e",
  cyan: "#00d9ff",
  gold: "#f5c518",
  title: "#00d9ff",
};

if (!TOKEN) {
  console.error("Mangler GITHUB_TOKEN i miljøet.");
  process.exit(1);
}

// --- GraphQL ----------------------------------------------------------------
async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "mobo-stats",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const QUERY = `
query ($login: String!, $after: String) {
  user(login: $login) {
    name
    login
    createdAt
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
    repositories(
      first: 100
      after: $after
      ownerAffiliations: OWNER
      isFork: false
      orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function collect() {
  let after = null;
  let stars = 0;
  let repoCount = 0;
  const langSize = new Map();
  const langColor = new Map();
  let user;

  do {
    const data = await gql(QUERY, { login: USER, after });
    user = data.user;
    const repos = user.repositories;
    repoCount = repos.totalCount;
    for (const repo of repos.nodes) {
      stars += repo.stargazerCount;
      for (const edge of repo.languages.edges) {
        const n = edge.node.name;
        langSize.set(n, (langSize.get(n) || 0) + edge.size);
        if (edge.node.color) langColor.set(n, edge.node.color);
      }
    }
    after = repos.pageInfo.hasNextPage ? repos.pageInfo.endCursor : null;
  } while (after);

  const cc = user.contributionsCollection;
  const totalLang = [...langSize.values()].reduce((a, b) => a + b, 0) || 1;
  const langs = [...langSize.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({
      name,
      pct: (size / totalLang) * 100,
      color: langColor.get(name) || C.cyan,
    }));

  return {
    name: user.name || user.login,
    repoCount,
    stars,
    followers: user.followers.totalCount,
    yearContribs: cc.contributionCalendar.totalContributions,
    totalCommits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: cc.totalPullRequestContributions,
    joined: new Date(user.createdAt).getFullYear(),
    langs,
  };
}

// --- Hjelpere ---------------------------------------------------------------
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
const fmt = (n) => n.toLocaleString("en-US");

// Liten katt-silhuett (hyllest til MoBo) i hjørnet
const catPaw = (x, y, fill) => `
  <g transform="translate(${x},${y})" fill="${fill}" opacity="0.9">
    <ellipse cx="0" cy="6" rx="6" ry="5"/>
    <ellipse cx="-7" cy="-2" rx="2.4" ry="3.4"/>
    <ellipse cx="-2.6" cy="-5" rx="2.4" ry="3.6"/>
    <ellipse cx="2.6" cy="-5" rx="2.4" ry="3.6"/>
    <ellipse cx="7" cy="-2" rx="2.4" ry="3.4"/>
  </g>`;

// --- Kort 1: oversikt -------------------------------------------------------
function statsCard(d) {
  const W = 460, H = 195;
  const rows = [
    ["Public repos", fmt(d.repoCount)],
    ["Stars earned", fmt(d.stars)],
    ["Followers", fmt(d.followers)],
    ["Commits (siste år)", fmt(d.totalCommits)],
    ["Pull requests", fmt(d.prs)],
    ["Bidrag (siste år)", fmt(d.yearContribs)],
  ];
  const startY = 78;
  const lineH = 19.5;
  const items = rows
    .map(
      (r, i) => `
    <g transform="translate(30, ${startY + i * lineH})">
      <circle cx="3" cy="-4" r="2.5" fill="${C.cyan}"/>
      <text x="16" y="0" fill="${C.text}" font-size="13">${esc(r[0])}</text>
      <text x="${W - 60}" y="0" fill="${C.gold}" font-size="13" font-weight="700" text-anchor="end">${esc(r[1])}</text>
    </g>`
    )
    .join("");

  // NB: statiske SVG-er — GitHub serverer dem via <img>, der Chrome IKKE kjører
  // CSS @keyframes. Alt innhold er derfor synlig uten animasjon.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(d.name)} GitHub stats">
  <style>.t { font-family: 'Segoe UI', Ubuntu, sans-serif; }</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${C.bg}" stroke="${C.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="4" rx="2" fill="${C.cyan}"/>
  <g class="t">
    <text x="30" y="42" fill="${C.title}" font-size="19" font-weight="700">${esc(d.name)} — GitHub Stats</text>
    <text x="30" y="60" fill="${C.muted}" font-size="11.5">Self-hosted · oppdateres daglig · på GitHub siden ${d.joined}</text>
    ${items}
    ${catPaw(W - 34, 36, C.gold)}
  </g>
</svg>`;
}

// --- Kort 2: språk ----------------------------------------------------------
function langsCard(d) {
  const W = 460, H = 195;
  const barX = 30, barW = W - 60, barY = 70, barH = 12;

  // Stablet prosentbar
  let acc = 0;
  const segments = d.langs
    .map((l) => {
      const w = (l.pct / 100) * barW;
      const seg = `<rect x="${(barX + acc).toFixed(2)}" y="${barY}" width="${Math.max(w, 0).toFixed(2)}" height="${barH}" fill="${l.color}"><title>${esc(l.name)} ${l.pct.toFixed(1)}%</title></rect>`;
      acc += w;
      return seg;
    })
    .join("");

  // Legend (2 kolonner)
  const legend = d.langs
    .map((l, i) => {
      const col = i % 2;
      const r = Math.floor(i / 2);
      const x = barX + col * (barW / 2);
      const y = barY + 36 + r * 24;
      return `
      <g transform="translate(${x}, ${y})">
        <circle cx="5" cy="-4" r="5" fill="${l.color}"/>
        <text x="16" y="0" fill="${C.text}" font-size="12.5">${esc(l.name)}</text>
        <text x="${barW / 2 - 24}" y="0" fill="${C.muted}" font-size="12.5" text-anchor="end">${l.pct.toFixed(1)}%</text>
      </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top languages">
  <style>.t { font-family: 'Segoe UI', Ubuntu, sans-serif; }</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${C.bg}" stroke="${C.border}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="4" rx="2" fill="${C.gold}"/>
  <g class="t">
    <text x="30" y="42" fill="${C.title}" font-size="19" font-weight="700">Mest brukte språk</text>
    <clipPath id="round"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6"/></clipPath>
    <g clip-path="url(#round)">${segments}</g>
    ${legend}
    ${catPaw(W - 34, 36, C.cyan)}
  </g>
</svg>`;
}

// --- Main -------------------------------------------------------------------
async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  console.log("✓", path);
}

const data = await collect();
await write(OUT_STATS, statsCard(data));
await write(OUT_LANGS, langsCard(data));
console.log("Ferdig:", JSON.stringify({ repos: data.repoCount, stars: data.stars, followers: data.followers, langs: data.langs.map((l) => l.name) }));
