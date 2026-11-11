export interface HarGharJalDistrictRow {
  sno: number;
  district: string;
  blocks: number;
  hgjBlocksReported: number;
  hgjBlocksCertified: number;
  panchayats: number;
  hgjPanchayatsReported: number;
  hgjPanchayatsCertified: number;
  villages: number;
  hgjVillagesReported: number;
  hgjVillagesCertified: number;
  reportedNotCertified: number;
}

export interface HarGharJalResult {
  finyear: string | undefined;
  stateCode: string;
  fetchedAt: string;
  districts: HarGharJalDistrictRow[];
}

export declare function fetchHarGharJal(
  stateCode?: string,
  finyear?: string,
  category?: string,
  retries?: number
): Promise<HarGharJalResult>;
