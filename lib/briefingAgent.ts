import crypto from 'crypto';
import prisma from './prisma';

export const BRIEFING_PROMPT_VERSION = 'briefing.deterministic.v3';
export const HAR_GHAR_JAL_SOURCE = 'har_ghar_jal';

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function formatNumber(n: number) {
  return n.toLocaleString('en-IN');
}

function pct(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function severityLabel(severity: number) {
  if (severity >= 5) return 'critical';
  if (severity >= 4) return 'high';
  if (severity >= 3) return 'medium';
  if (severity >= 2) return 'low';
  return 'info';
}

function hgStats(latest: { otherBuckets: unknown }) {
  const o = latest.otherBuckets;
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const d = o as Record<string, unknown>;
  if (d.source !== HAR_GHAR_JAL_SOURCE) return null;
  return {
    finyear: typeof d.finyear === 'string' ? d.finyear : undefined,
    villagesReported: Number(d.villagesReported ?? 0),
    villagesCertified: Number(d.villagesCertified ?? 0),
  };
}

const FIELD_CHECKS_EN = [
  'Verify a random sample of villages reported at 100% coverage on the ground — taps installed, functional, and quality acceptable.',
  'Ask the state JJM cell why reported villages have not been certified, and what documentation is pending where the certification gap is largest.',
  'Visit villages with no data reported to establish whether they are uncovered, or simply missing from the reporting pipeline.',
  'Inspect the measurement and reporting workflow used at village and panchayat level, including who signs off the figures.',
  'Reconcile the reported figures with Gram Panchayat records and the last three months of data-entry logs.',
];

const FIELD_CHECKS_HI = [
  '100% कवरेज दर्शाए गए गांवों के यादृच्छिक नमूने का भौतिक सत्यापन करें — नल लगे हैं, कार्यरत हैं और जल गुणवत्ता ठीक है।',
  'जिन गांवों की रिपोर्टिंग हुई है परंतु प्रमाणीकरण (सर्टिफिकेशन) नहीं हुआ, उनके लिए राज्य JJM सेल से कारण और लंबित दस्तावेज़ पूछें।',
  'जिन गांवों का कोई डेटा रिपोर्ट नहीं हुआ है, ऐसे कुछ गांवों का स्थल निरीक्षण करें ताकि पता चले कि वे असुरक्षित हैं या रिपोर्टिंग में गायब हैं।',
  'गांव व पंचायत स्तर पर मापन और रिपोर्टिंग प्रक्रिया की जांच करें, जिनमें आंकड़ों पर हस्ताक्षर कौन करता है, यह भी शामिल है।',
  'रिपोर्ट किए गए आंकड़ों का ग्राम पंचायत रिकॉर्ड और पिछले तीन महीनों के डेटा-एंट्री लॉग से मिलान करें।',
];

const CAVEATS_EN =
  'Data caveats: figures are taken from the stored snapshots of this system, sourced from public Jal Jeevan Mission reporting (ejalshakti.gov.in Har Ghar Jal district reports). They are as reported by field/state systems and may lag or differ from ground reality pending certification and verification. Every number above comes directly from stored data; nothing is generated or estimated.';

const CAVEATS_HI =
  'डेटा चेतावनी: आंकड़े इस प्रणाली में संग्रहीत स्नैपशॉट से लिए गए हैं, जिनका स्रोत सार्वजनिक जल जीवन मिशन रिपोर्टिंग (ejalshakti.gov.in की हर घर जल जिला रिपोर्ट) है। ये क्षेत्र/राज्य स्तर से रिपोर्ट किए गए हैं और प्रमाणीकरण व सत्यापन लंबित होने तक भूमि-स्थिति से भिन्न हो सकते हैं। ऊपर दिए गए सभी आंकड़े सीधे संग्रहीत डेटा से लिए गए हैं; कुछ भी अनुमानित नहीं किया गया है।';

type Summary = {
  totalVillages: number;
  zeroFhtcVillages: number;
  fullFhtcVillages: number;
  percentZero: number;
  percentFull: number;
};

function buildContentEn(
  districtName: string,
  districtCode: string,
  year: number,
  summary: Summary,
  hg: { finyear?: string; villagesReported: number; villagesCertified: number } | null,
  flags: Array<{ type: string; severity: number; score: number; explanation: string }>
) {
  const lines: string[] = [];

  lines.push(`DISTRICT COLLECTOR BRIEFING — ${districtName} (${districtCode})`);
  lines.push(
    hg
      ? `Har Ghar Jal report, FY ${hg.finyear ?? year} | Deterministic audit, generated from stored data only`
      : `Analysis year: ${year} | Deterministic audit, generated from stored data only`
  );
  lines.push('');
  lines.push('SUMMARY');
  lines.push(`- Total villages: ${formatNumber(summary.totalVillages)}`);

  if (hg) {
    const reported = hg.villagesReported;
    const certified = hg.villagesCertified;
    const unreported = Math.max(0, summary.totalVillages - reported);
    const notCertified = Math.max(0, reported - certified);
    lines.push(`- Villages with data reported: ${formatNumber(reported)} (${pct(reported, summary.totalVillages).toFixed(1)}%)`);
    lines.push(`- Villages certified: ${formatNumber(certified)} (${pct(certified, summary.totalVillages).toFixed(1)}% of total)`);
    lines.push(`- Reported but not certified: ${formatNumber(notCertified)} (${pct(notCertified, reported).toFixed(1)}% of reported)`);
    lines.push(`- No data reported: ${formatNumber(unreported)} (${pct(unreported, summary.totalVillages).toFixed(1)}%)`);
  } else {
    lines.push(`- Villages at 0% FHTC: ${formatNumber(summary.zeroFhtcVillages)} (${summary.percentZero.toFixed(1)}%)`);
    lines.push(`- Villages at 100% FHTC: ${formatNumber(summary.fullFhtcVillages)} (${summary.percentFull.toFixed(1)}%)`);
  }

  if (flags.length > 0) {
    lines.push('');
    lines.push('WHY THIS DISTRICT IS FLAGGED');
    for (const f of flags) {
      lines.push(`- [${severityLabel(f.severity)} | score ${f.score}] ${f.type}: ${f.explanation}`);
    }
  } else {
    lines.push('');
    lines.push('No data inconsistencies were raised for the latest analysis.');
  }

  lines.push('');
  lines.push('TOP FIELD CHECKS');
  FIELD_CHECKS_EN.forEach((c, i) => lines.push(`${i + 1}. ${c}`));

  lines.push('');
  lines.push(CAVEATS_EN);

  return lines.join('\n');
}

function buildContentHi(
  districtName: string,
  districtCode: string,
  year: number,
  summary: Summary,
  hg: { finyear?: string; villagesReported: number; villagesCertified: number } | null,
  flags: Array<{ type: string; severity: number; score: number; explanation: string }>
) {
  const lines: string[] = [];

  lines.push(`जिला कलेक्टर ब्रिफिंग — ${districtName} (${districtCode})`);
  lines.push(
    hg
      ? `हर घर जल रिपोर्ट, वित्तीय वर्ष ${hg.finyear ?? year} | नियतात्मक ऑडिट, केवल संग्रहीत डेटा से जनरेटेड`
      : `विश्लेषण वर्ष: ${year} | नियतात्मक ऑडिट, केवल संग्रहीत डेटा से जनरेटेड`
  );
  lines.push('');
  lines.push('सारांश');
  lines.push(`- कुल गांव: ${formatNumber(summary.totalVillages)}`);

  if (hg) {
    const reported = hg.villagesReported;
    const certified = hg.villagesCertified;
    const unreported = Math.max(0, summary.totalVillages - reported);
    const notCertified = Math.max(0, reported - certified);
    lines.push(`- रिपोर्टिंग हुई गांव: ${formatNumber(reported)} (${pct(reported, summary.totalVillages).toFixed(1)}%)`);
    lines.push(`- प्रमाणित गांव: ${formatNumber(certified)} (कुल का ${pct(certified, summary.totalVillages).toFixed(1)}%)`);
    lines.push(`- रिपोर्ट किंतु अनप्रमाणित: ${formatNumber(notCertified)} (रिपोर्टेड का ${pct(notCertified, reported).toFixed(1)}%)`);
    lines.push(`- कोई डेटा नहीं: ${formatNumber(unreported)} (${pct(unreported, summary.totalVillages).toFixed(1)}%)`);
  } else {
    lines.push(`- 0% FHTC वाले गांव: ${formatNumber(summary.zeroFhtcVillages)} (${summary.percentZero.toFixed(1)}%)`);
    lines.push(`- 100% FHTC वाले गांव: ${formatNumber(summary.fullFhtcVillages)} (${summary.percentFull.toFixed(1)}%)`);
  }

  if (flags.length > 0) {
    lines.push('');
    lines.push('यह जिला क्यों फ्लैग हुआ');
    for (const f of flags) {
      lines.push(`- [${severityLabel(f.severity)} | स्कोर ${f.score}] ${f.type}: ${f.explanation}`);
    }
  } else {
    lines.push('');
    lines.push('ताज़ा विश्लेषण में कोई डेटा विसंगति नहीं पाई गई।');
  }

  lines.push('');
  lines.push('प्रमुख फील्ड जांच');
  FIELD_CHECKS_HI.forEach((c, i) => lines.push(`${i + 1}. ${c}`));

  lines.push('');
  lines.push(CAVEATS_HI);

  return lines.join('\n');
}

export async function generateBriefing(districtId: string) {
  const inputHash = sha256(JSON.stringify({ districtId, promptVersion: BRIEFING_PROMPT_VERSION }));
  const audit = await prisma.auditLog.create({
    data: {
      action: 'briefing_generate',
      inputHash,
      outputHash: '',
      model: null,
      promptVersion: BRIEFING_PROMPT_VERSION,
      metadata: { districtId, status: 'running' },
    },
  });

  try {
    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) throw new Error('district_not_found');

    const snapshots = await prisma.snapshot.findMany({ where: { districtId }, orderBy: { year: 'desc' }, take: 3 });
    const latest = snapshots[0];
    if (!latest) throw new Error('no_snapshot');

    const flags = await prisma.flag.findMany({
      where: { districtId },
      orderBy: [{ severity: 'desc' }, { score: 'desc' }],
      take: 5,
    });

    const summary = {
      totalVillages: latest.totalVillages,
      zeroFhtcVillages: latest.zeroFhtcVillages,
      fullFhtcVillages: latest.fullFhtcVillages,
      percentZero: pct(latest.zeroFhtcVillages, latest.totalVillages),
      percentFull: pct(latest.fullFhtcVillages, latest.totalVillages),
    };

    const hg = hgStats(latest);
    const flagSummaries = flags.map((f) => ({ type: f.type, severity: f.severity, score: f.score, explanation: f.explanation }));

    const enContent = buildContentEn(district.name, district.code, latest.year, summary, hg, flagSummaries);
    const hiContent = buildContentHi(district.name, district.code, latest.year, summary, hg, flagSummaries);

    await prisma.$transaction([
      prisma.briefing.upsert({
        where: { districtId_language: { districtId, language: 'en' } },
        update: { content: enContent },
        create: { districtId, language: 'en', content: enContent },
      }),
      prisma.briefing.upsert({
        where: { districtId_language: { districtId, language: 'hi' } },
        update: { content: hiContent },
        create: { districtId, language: 'hi', content: hiContent },
      }),
    ]);

    const outputHash = sha256(enContent + '\n---\n' + hiContent);
    await prisma.auditLog.update({
      where: { id: audit.id },
      data: {
        outputHash,
        metadata: {
          districtId,
          district: district.name,
          year: latest.year,
          flagsCited: flagSummaries.length,
          languages: ['en', 'hi'],
          llmUsed: false,
          status: 'completed',
        },
      },
    });

    return { en: enContent, hi: hiContent, year: latest.year, generatedAt: audit.createdAt };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.auditLog.update({
      where: { id: audit.id },
      data: { outputHash: sha256(msg), metadata: { districtId, status: 'failed', error: msg } },
    });
    throw e;
  }
}
