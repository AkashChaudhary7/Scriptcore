import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { Script, AppSettings, SyncData } from '../types';

const firebaseConfig = {
  projectId: "windy-ship-2f4nj",
  appId: "1:711289427002:web:e6462ab7b35453f2931103",
  apiKey: "AIzaSyBKbQtsTOw-QZ47ep2oTktDmfvcHWRntp8",
  authDomain: "windy-ship-2f4nj.firebaseapp.com",
  storageBucket: "windy-ship-2f4nj.firebasestorage.app",
  messagingSenderId: "711289427002"
};

// Initialize Firebase app safely
let app;
let db: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Firestore might use a custom database name as specified in config:
  // "firestoreDatabaseId": "ai-studio-ccadb7b8-4d2d-4135-b5c2-f8af9f6e72ef"
  db = getFirestore(app, "ai-studio-ccadb7b8-4d2d-4135-b5c2-f8af9f6e72ef");
} catch (error) {
  console.error("Firebase initialization failed, falling back to local storage.", error);
}

// Generate an elegant, human-readable Sync Key
export function generateSyncKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing characters like 0/O, 1/I
  let result = 'SYNC-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Backup the specified scripts and settings to the user's secret Sync Key document.
 */
export async function backupToCloud(syncKey: string, scripts: Script[], settings: AppSettings): Promise<boolean> {
  if (!db) {
    throw new Error("Cloud service is unavailable. Storing locally.");
  }
  if (!syncKey || syncKey.trim() === '') {
    throw new Error("Invalid sync key");
  }

  const cleanSettings = {
    themeMode: settings.themeMode,
    primaryColor: settings.primaryColor,
    editorFontSize: settings.editorFontSize,
    enableAutosave: settings.enableAutosave
  };

  const payload: SyncData = {
    syncKey,
    scripts,
    settings: cleanSettings,
    lastSyncedAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'scriptSync', syncKey.toUpperCase().trim());
    await setDoc(docRef, payload);
    return true;
  } catch (error) {
    console.error("Cloud backup failed", error);
    throw error;
  }
}

/**
 * Retrieve data from secure cloud backup using the Sync Key
 */
export async function fetchFromCloud(syncKey: string): Promise<SyncData | null> {
  if (!db) {
    throw new Error("Cloud service is unavailable.");
  }
  if (!syncKey || syncKey.trim() === '') {
    return null;
  }

  try {
    const docRef = doc(db, 'scriptSync', syncKey.toUpperCase().trim());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SyncData;
    }
    return null;
  } catch (error) {
    console.error("Cloud restore failed", error);
    throw error;
  }
}
