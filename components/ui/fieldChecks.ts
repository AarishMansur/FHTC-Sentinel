/**
 * Field-check lists shown in the district page's right column and the
 * briefing. Mirrors FIELD_CHECKS_EN / FIELD_CHECKS_HI in lib/briefingAgent.ts
 * (v3 deterministic template) for display purposes only — lib/ is the source
 * of truth for briefing content and is intentionally untouched.
 */
export const FIELD_CHECKS_EN = [
  'Verify a random sample of villages reported at 100% coverage on the ground — taps installed, functional, and quality acceptable.',
  'Ask the state JJM cell why reported villages have not been certified, and what documentation is pending where the certification gap is largest.',
  'Visit villages with no data reported to establish whether they are uncovered, or simply missing from the reporting pipeline.',
  'Inspect the measurement and reporting workflow used at village and panchayat level, including who signs off the figures.',
  'Reconcile the reported figures with Gram Panchayat records and the last three months of data-entry logs.',
];

export const FIELD_CHECKS_HI = [
  '100% कवरेज दर्शाए गए गांवों के यादृच्छिक नमूने का भौतिक सत्यापन करें — नल लगे हैं, कार्यरत हैं और जल गुणवत्ता ठीक है।',
  'जिन गांवों की रिपोर्टिंग हुई है परंतु प्रमाणीकरण (सर्टिफिकेशन) नहीं हुआ, उनके लिए राज्य JJM सेल से कारण और लंबित दस्तावेज़ पूछें।',
  'जिन गांवों का कोई डेटा रिपोर्ट नहीं हुआ है, ऐसे कुछ गांवों का स्थल निरीक्षण करें ताकि पता चले कि वे असुरक्षित हैं या रिपोर्टिंग में गायब हैं।',
  'गांव व पंचायत स्तर पर मापन और रिपोर्टिंग प्रक्रिया की जांच करें, जिनमें आंकड़ों पर हस्ताक्षर कौन करता है, यह भी शामिल है।',
  'रिपोर्ट किए गए आंकड़ों का ग्राम पंचायत रिकॉर्ड और पिछले तीन महीनों के डेटा-एंट्री लॉग से मिलान करें।',
];
