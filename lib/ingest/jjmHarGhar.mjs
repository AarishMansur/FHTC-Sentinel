// Fetch JJM "Har Ghar Jal" (Format J8) report: villages reported vs certified, by district.
// Source: https://ejalshakti.gov.in/JJM/JJMReports/Physical/JJMRep_HarGharJalVillage.aspx
// Node 18+ (built-in fetch). No API key, no dependencies.
// Usage: node jjmHarGhar.mjs [stateCode] [finyear]   e.g. node jjmHarGhar.mjs 27   (27 = Rajasthan)

import { pathToFileURL } from "node:url";

const URL = "https://ejalshakti.gov.in/JJM/JJMReports/Physical/JJMRep_HarGharJalVillage.aspx";
const COLS = ["sno", "district", "blocks", "hgjBlocksReported", "hgjBlocksCertified",
  "panchayats", "hgjPanchayatsReported", "hgjPanchayatsCertified",
  "villages", "hgjVillagesReported", "hgjVillagesCertified"];
const UA = "Mozilla/5.0 (FHTC-Sentinel)";

const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function hidden(html) {
  const out = {};
  for (const m of html.matchAll(/<input[^>]*name="(__[A-Z]+)"[^>]*value="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function options(html, name) {
  const block = html.match(new RegExp(name + "[\\s\\S]*?</select>"))?.[0] ?? "";
  return [...block.matchAll(/<option[^>]*value="([^"]*)"/g)].map((m) => m[1]);
}

function rows(html) {
  const out = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]));
    if (cells.length >= 11 && /^\d+$/.test(cells[0])) {
      const row = {};
      COLS.forEach((k, i) => (row[k] = k === "district" ? cells[i] : parseInt(cells[i].replace(/,/g, "") || "0", 10)));
      row.reportedNotCertified = row.hgjVillagesReported - row.hgjVillagesCertified;
      out.push(row);
    }
  }
  return out;
}

async function withTimeout(url, opts = {}, ms = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

export async function fetchHarGharJal(stateCode = "27", finyear, category = "1", retries = 2) {
  for (let attempt = 0; ; attempt++) {
    try {
      const first = await withTimeout(URL, { headers: { "User-Agent": UA } });
      const cookie = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
      const html = await first.text();
      const fy = finyear ?? options(html, "ddFinyear").at(-1); // latest snapshot
      const body = new URLSearchParams({
        ...hidden(html),
        "ctl00$CPHPage$ddFinyear": fy,
        "ctl00$CPHPage$ddState": stateCode,
        "ctl00$CPHPage$ddtype": category, // 1 = All Districts
        "ctl00$CPHPage$btnShow": "Show",
      });
      const res = await withTimeout(URL, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const districts = rows(await res.text());
      if (!districts.length) throw new Error("No rows parsed");
      return { finyear: fy, stateCode, fetchedAt: new Date().toISOString(), districts };
    } catch (e) {
      if (attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    const data = await fetchHarGharJal(process.argv[2] ?? "27", process.argv[3]);
    console.log(JSON.stringify(data, null, 2));
  })().catch((e) => { console.error(e); process.exit(1); });
}
