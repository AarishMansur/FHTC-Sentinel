export const ESRI_YEARS = [2023, 2024, 2025] as const;

export type EsriYear = (typeof ESRI_YEARS)[number];

function envYearFields(year: EsriYear) {
  return {
    totalVillages: process.env[`ESRI_FIELD_${year}_TOTAL`],
    zeroFhtc: process.env[`ESRI_FIELD_${year}_ZERO`],
    fullFhtc: process.env[`ESRI_FIELD_${year}_FULL`],
  };
}

export const ESRI_CONFIG = {
  baseUrl:
    process.env.ESRI_BASE_URL ||
    'https://services.arcgis.com/your_org/arcgis/rest/services/JJM_FHTC_Districts/FeatureServer/0',

  pageSize: Math.min(2000, Math.max(1, parseInt(process.env.ESRI_PAGE_SIZE || '100', 10) || 100)),

  requestRetryAttempts: Math.min(10, Math.max(0, parseInt(process.env.ESRI_RETRIES || '3', 10) || 3)),

  requestTimeoutMs: Math.min(120_000, Math.max(5_000, parseInt(process.env.ESRI_TIMEOUT_MS || '30000', 10) || 30_000)),

  concurrency: Math.min(10, Math.max(1, parseInt(process.env.ESRI_CONCURRENCY || '3', 10) || 3)),

  fields: {
    districtCode: process.env.ESRI_FIELD_CODE || 'DIST_CODE',
    districtName: process.env.ESRI_FIELD_NAME || 'DIST_NAME',
    stateName: process.env.ESRI_FIELD_STATE || 'STATE',
    ...Object.fromEntries(
      ESRI_YEARS.flatMap((y) => {
        const f = envYearFields(y);
        return [
          [`year${y}_totalVillages`, f.totalVillages],
          [`year${y}_zeroFhtc`, f.zeroFhtc],
          [`year${y}_fullFhtc`, f.fullFhtc],
        ];
      })
    ),
  } as Record<string, string | undefined>,

  bucketFields: {
    year2023: {
      '0-25': process.env.ESRI_FIELD_2023_BUCKET_0_25 || null,
      '25-50': process.env.ESRI_FIELD_2023_BUCKET_25_50 || null,
      '50-75': process.env.ESRI_FIELD_2023_BUCKET_50_75 || null,
      '75-100': process.env.ESRI_FIELD_2023_BUCKET_75_100 || null,
    },
    year2024: {
      '0-25': process.env.ESRI_FIELD_2024_BUCKET_0_25 || null,
      '25-50': process.env.ESRI_FIELD_2024_BUCKET_25_50 || null,
      '50-75': process.env.ESRI_FIELD_2024_BUCKET_50_75 || null,
      '75-100': process.env.ESRI_FIELD_2024_BUCKET_75_100 || null,
    },
    year2025: {
      '0-25': process.env.ESRI_FIELD_2025_BUCKET_0_25 || null,
      '25-50': process.env.ESRI_FIELD_2025_BUCKET_25_50 || null,
      '50-75': process.env.ESRI_FIELD_2025_BUCKET_50_75 || null,
      '75-100': process.env.ESRI_FIELD_2025_BUCKET_75_100 || null,
    },
  } as Record<string, Record<string, string | null>>,
};
