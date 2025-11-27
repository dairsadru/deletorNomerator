export interface ScriptConfig {
  mode: 'viewers' | 'contacts';
  scrollStep: number;
  scrollDelay: number;
  filterTime: boolean;
  filterKeywords: string[];
  autoCopy: boolean;
  autoDownload: boolean;
}

export interface ContactData {
  original: string;
  cleanName: string;
  isTime: boolean;
  isKeywordExcluded: boolean;
}

export interface AnalysisResult {
  totalScanned: number;
  uniqueContacts: number;
  excludedCount: number;
  contacts: string[];
}