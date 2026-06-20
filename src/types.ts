export interface ScriptVersion {
  id: string;
  version: string;
  code: string;
  changelog: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  code: string;
  version: string;
  versions: ScriptVersion[];
  createdAt: string;
  updatedAt: string;
  sitePattern: string; // e.g. *://example.com/* or matches Tampermonkey @match
}

export interface MockWebpage {
  id: string;
  name: string;
  description: string;
  category: string;
  html: string;
  url: string;
}

export interface SimulationLog {
  timestamp: number;
  type: 'info' | 'log' | 'warn' | 'error' | 'success' | 'dom';
  message: string;
  details?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number; // in ms
  rating: 'good' | 'average' | 'poor';
  explanation: string;
}

export interface AppSettings {
  themeMode: 'light' | 'dark' | 'nebula';
  primaryColor: string; // Tailwind color class name or hex
  editorFontSize: number;
  enableAutosave: boolean;
  syncKey: string;
}

export interface SyncData {
  syncKey: string;
  scripts: Script[];
  settings: {
    themeMode: 'light' | 'dark' | 'nebula';
    primaryColor: string;
    editorFontSize: number;
    enableAutosave: boolean;
  };
  lastSyncedAt: string;
}
