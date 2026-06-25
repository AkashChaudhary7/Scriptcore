import React, { useState, useEffect } from 'react';
import { Script, AppSettings } from './types';
import { sampleScripts } from './data';
import Dashboard from './components/Dashboard';
import CodeEditor from './components/CodeEditor';
import { Sliders, Code, Terminal, Shield, RefreshCw, Search, Crown, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

export default function App() {
  // 1. App preferences settings state initialization
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('tamper_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to defaults
      }
    }
    return {
      themeMode: 'nebula',
      primaryColor: 'violet',
      editorFontSize: 13,
      enableAutosave: true,
      syncKey: ''
    };
  });

  // 2. Scripts state initialization
  const [scripts, setScripts] = useState<Script[]>(() => {
    const saved = localStorage.getItem('tamper_scripts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return sampleScripts;
  });

  // Cloud sync verification indicators
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'offline' | 'error' | 'syncing'>('syncing');
  const [cloudErrorText, setCloudErrorText] = useState<string | null>(null);

  // 3. active workspaces controls
  const [activeScriptId, setActiveScriptId] = useState<string>(() => {
    const saved = localStorage.getItem('tamper_scripts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return sampleScripts[0]?.id || '';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor'>('dashboard');

  // Administrative verification gating states
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Real-time Firestore sync & seeding
  useEffect(() => {
    setCloudSyncStatus('syncing');
    const unsubscribe = onSnapshot(collection(db, 'scripts'), (snapshot) => {
      const fetched: Script[] = [];
      snapshot.forEach(docSnap => {
        fetched.push({ ...docSnap.data() } as Script);
      });
      
      if (fetched.length > 0) {
        setScripts(fetched);
        setCloudSyncStatus('connected');
        setCloudErrorText(null);
      } else {
        // Automatically seed with default sample scripts if the database is clean & empty
        sampleScripts.forEach(async (s) => {
          try {
            await setDoc(doc(db, 'scripts', s.id), s);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `scripts/${s.id}`);
          }
        });
        setCloudSyncStatus('connected');
        setCloudErrorText(null);
      }
    }, (error) => {
      console.warn('Firestore subscription status: Offline/Insufficient Permissions', error);
      setCloudSyncStatus('error');
      setCloudErrorText(error instanceof Error ? error.message : String(error));
    });

    return () => unsubscribe();
  }, []);

  // Save scripts to device cache
  useEffect(() => {
    if (settings.enableAutosave) {
      localStorage.setItem('tamper_scripts', JSON.stringify(scripts));
    }
  }, [scripts, settings.enableAutosave]);

  // Save preferences to device cache
  useEffect(() => {
    localStorage.setItem('tamper_settings', JSON.stringify(settings));
  }, [settings]);

  // Derived current active script target
  const activeScript = scripts.find(s => s.id === activeScriptId) || scripts[0];

  // Global settings changes
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  // Safe handler to update file content inside local script state array
  const handleCodeChange = async (newCode: string) => {
    const targetScript = scripts.find(s => s.id === activeScriptId) || scripts[0];
    if (!targetScript) return;
    
    // Update local state is optional but keeps it feels extremely responsive (optimistic UI)
    setScripts(prev => prev.map(s => {
      if (s.id === targetScript.id) {
        return {
          ...s,
          code: newCode,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));

    try {
      await setDoc(doc(db, 'scripts', targetScript.id), {
        ...targetScript,
        code: newCode,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `scripts/${targetScript.id}`);
    }
  };

  // Add historical rollback version nodes (commits)
  const handleCommitNewVersion = async (version: string, changelog: string, code: string) => {
    const targetScript = scripts.find(s => s.id === activeScriptId) || scripts[0];
    if (!targetScript) return;

    const newVer = {
      id: 'ver-' + Date.now(),
      version,
      code,
      changelog,
      updatedAt: new Date().toISOString()
    };

    const updatedScript = {
      ...targetScript,
      version,
      code,
      versions: [newVer, ...targetScript.versions],
      updatedAt: new Date().toISOString()
    };

    setScripts(prev => prev.map(s => s.id === targetScript.id ? updatedScript : s));

    try {
      await setDoc(doc(db, 'scripts', targetScript.id), updatedScript);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `scripts/${targetScript.id}`);
    }
  };

  // Create a brand new script with formatted Tampermonkey header template blocks
  const handleAddNewScript = async (name: string, description: string, matchPattern: string, tags: string) => {
    const freshId = 'script-' + Date.now();
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagArray.length === 0) tagArray.push('Utility');

    const freshScript: Script = {
      id: freshId,
      name,
      description,
      author: 'Akash Chaudhary',
      tags: tagArray,
      code: `// ==UserScript==
// @name         ${name}
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  ${description || 'Greasemonkey custom automation script'}
// @match        ${matchPattern || '*://*/*'}
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    console.log("${name} deployed trace successfully!");
    
    // Write your interactive dom overrides here...
    
})();`,
      version: '1.0.0',
      versions: [
        {
          id: 'ver-init',
          version: '1.0.0',
          code: '// Initial draft',
          changelog: 'Created workspace standard headers template',
          updatedAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sitePattern: matchPattern
    };

    setScripts(prev => [freshScript, ...prev]);
    setActiveScriptId(freshId);
    setActiveTab('editor'); // automatically direct user to code workspace for immediate tweaks!

    try {
      await setDoc(doc(db, 'scripts', freshId), freshScript);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `scripts/${freshId}`);
    }
  };

  const handleDeleteScript = async (id: string) => {
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    if (activeScriptId === id && updated.length > 0) {
      setActiveScriptId(updated[0].id);
    }

    try {
      await deleteDoc(doc(db, 'scripts', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `scripts/${id}`);
    }
  };

  const handleDuplicateScript = async (id: string) => {
    const s = scripts.find(script => script.id === id);
    if (!s) return;
    const freshId = 'script-' + Date.now();
    const duplicated: Script = {
      ...s,
      id: freshId,
      name: `${s.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          id: 'ver-init-' + Date.now(),
          version: '1.0.0',
          code: s.code,
          changelog: `Duplicated from ${s.name}`,
          updatedAt: new Date().toISOString()
        }
      ]
    };

    setScripts(prev => [duplicated, ...prev]);
    setActiveScriptId(freshId);

    try {
      await setDoc(doc(db, 'scripts', freshId), duplicated);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `scripts/${freshId}`);
    }
  };

  const handleBatchDeleteScripts = async (ids: string[]) => {
    const updated = scripts.filter(s => !ids.includes(s.id));
    setScripts(updated);
    if (activeScriptId && ids.includes(activeScriptId)) {
      if (updated.length > 0) {
        setActiveScriptId(updated[0].id);
      } else {
        setActiveScriptId('');
      }
    }

    // Delete elements one by one or via multiple deletes
    for (const id of ids) {
      try {
        await deleteDoc(doc(db, 'scripts', id));
      } catch (e) {
         handleFirestoreError(e, OperationType.DELETE, `scripts/${id}`);
      }
    }
  };

  const handleSyncWithBackup = async (backupData: { scripts: Script[]; settings: any }) => {
    setScripts(backupData.scripts);
    if (backupData.scripts.length > 0) {
      setActiveScriptId(backupData.scripts[0].id);
    }
    setSettings(prev => ({
      ...prev,
      ...backupData.settings
    }));

    // Back up scripts batchwise to Firestore
    for (const s of backupData.scripts) {
      try {
        await setDoc(doc(db, 'scripts', s.id), s);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `scripts/${s.id}`);
      }
    }
  };

  const handleCodeOptimized = (optimizedCode: string, explanation: string) => {
    handleCodeChange(optimizedCode);
  };

  const handleCodeDebugged = (repairedCode: string, explanation: string) => {
    handleCodeChange(repairedCode);
  };

  // Determine outermost colors according to theme setting choice
  const getThemeWrapperClass = () => {
    return 'bg-slate-950 text-slate-300 border-slate-800';
  };

  const getPrimaryGlow = () => {
    return '';
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-305 pb-12 ${getThemeWrapperClass()} relative`}>
      
      {/* TOP HEADER COMMAND DECK BANNER */}
      <header className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 relative z-10 bg-slate-950 border-slate-800`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700/50">
            <Sliders className="w-5 h-5 text-slate-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-50">
              <span className="font-extrabold text-slate-100">SCRIPT.CORE</span>
              <span className="text-[10px] uppercase bg-slate-800 text-slate-400 border border-slate-800 font-semibold px-2 py-0.5 rounded-full font-mono">v4.2</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span>SANDBOX HUB</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">REALTIME SIMULATION</span>
            </p>
          </div>
        </div>

        {/* Global status center */}
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <button 
            type="button"
            onClick={() => {
              if (isAdmin) {
                setIsAdmin(false);
              } else {
                setAdminPasswordInput('');
                setPasswordError('');
                setShowAdminModal(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border transition font-mono uppercase text-[9px] cursor-pointer hover:scale-105 duration-150 ${
              isAdmin 
                ? 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20' 
                : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-50'
            }`}
            title={isAdmin ? "You are an Administrator. Click to lock / log out admin authorization." : "Unlock developer administrator permissions (Password protected)"}
          >
            {isAdmin ? <Crown className="w-3.5 h-3.5 text-slate-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
            <span>{isAdmin ? 'ADMIN ACTIVE' : 'ADMIN UNLOCK'}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded bg-slate-800/60 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            <span className="text-slate-400 uppercase text-[9px] font-black">ARCHITECT:</span> 
            <span className="text-slate-50 font-extrabold uppercase tracking-widest text-[9px]">AKASH CHAUDHARY</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span className="uppercase text-slate-400">Sandbox: <b className="text-teal-400">ACTIVE</b></span>
          </div>

          <div className="flex items-center gap-2">
            {cloudSyncStatus === 'syncing' ? (
              <span className="flex items-center gap-1 text-sky-400 uppercase font-bold" title="Connecting to Firestore Database...">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                DBSync
              </span>
            ) : cloudSyncStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-teal-400 uppercase font-bold" title="Live linked with firestore applet database collection">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                DBSync Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500 uppercase font-bold" title="Firestore subscription restricted. Operating fully in secure Local Mode.">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                DBSync Local Mode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* WORKSPACE CENTRAL WRAPPER (Bounded to prevent stretching) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 flex flex-col space-y-4 relative">
        
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-2xs md:text-xs text-slate-400 font-mono tracking-wider border-b border-slate-800/40 pb-2 select-none shrink-0">
          <span 
            onClick={() => setActiveTab('dashboard')} 
            className="cursor-pointer hover:text-slate-50 hover:underline transition font-bold"
          >
            Library
          </span>
          {activeScript && (
            <>
              <span className="text-slate-600 font-semibold">&gt;</span>
              <span className="text-sky-400 font-semibold truncate max-w-[120px] md:max-w-[200px]" title={activeScript.name}>
                {activeScript.name}
              </span>
            </>
          )}
          {activeScript && activeTab !== 'dashboard' && (
            <>
              <span className="text-slate-600 font-semibold">&gt;</span>
              <span className="text-slate-250 font-bold uppercase tracking-widest text-[8px] md:text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800">
                {activeTab === 'editor' ? 'Editor' : 'Editor'}
              </span>
            </>
          )}
        </div>

        {/* Warn about local-only fallback if error is present */}
        {cloudSyncStatus === 'error' && (
          <div className="bg-amber-950/25 border border-amber-600/30 p-3 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                <strong>Secure Sandbox Fallback:</strong> Real-time Firestore synchronizer has authenticated. Your configurations are cached cleanly in local storage to bypass unauthorized read blocks.
              </span>
            </div>
            <button 
              onClick={() => setCloudSyncStatus('offline')} 
              className="text-amber-550 hover:text-slate-400 text-2xs uppercase tracking-widest font-bold underline font-mono cursor-pointer shrink-0"
            >
              Acknowledge
            </button>
          </div>
        )}
        
        {/* TAB WORKSPACE ACCESS CONTROLLERS */}
        <div className={`p-1.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 relative z-10 ${
          settings.themeMode === 'light' ? 'bg-slate-200/60 border-slate-350' : 'bg-slate-800/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-1">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 xs:px-3 px-2 py-2 rounded text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-black shadow-md font-black italic'
                  : 'text-slate-400 hover:text-slate-50'
              }`}
              id="tab-btn-dashboard"
            >
              <Terminal className="w-4 h-4" />
              <span>Library</span>
            </button>

            {activeScript && (
              <>
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center gap-1.5 xs:px-3 px-2 py-2 rounded text-xs font-black uppercase tracking-wider transition ${
                    activeTab === 'editor'
                      ? 'bg-white text-black shadow-md font-black italic'
                      : 'text-slate-400 hover:text-slate-50'
                  }`}
                  id="tab-btn-editor"
                >
                  <Code className="w-4 h-4" />
                  <span>Editor</span>
                </button>
              </>
            )}
          </div>

          {activeScript && (
            <div className="text-[10px] font-mono text-slate-500 mr-2 uppercase tracking-widest font-bold">
              Active: <span className="text-teal-400 font-black">{activeScript.name} v{activeScript.version}</span>
            </div>
          )}
        </div>

        {/* ACTIVE WORKSPACE CARD MOUNT */}
        <div className={`flex-1 relative z-10 transition-all duration-150`}>
          
          {activeTab === 'dashboard' && (
            <Dashboard
              scripts={scripts}
              activeScriptId={activeScriptId}
              onSelectScript={(id) => {
                setActiveScriptId(id);
                // When selecting a script, direct the user directly to the Code editor for maximum layout speed efficiency
                setActiveTab('editor');
              }}
              onAddNewScript={handleAddNewScript}
              onDeleteScript={handleDeleteScript}
              onDuplicateScript={handleDuplicateScript}
              onBatchDeleteScripts={handleBatchDeleteScripts}
              isAdmin={isAdmin}
              onPromptAdminUnlock={() => setShowAdminModal(true)}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onSyncWithBackup={handleSyncWithBackup}
            />
          )}

          {activeTab === 'editor' && activeScript && (
            <div className="h-[550px]">
              <CodeEditor
                activeScript={activeScript}
                onCodeChange={handleCodeChange}
                onCommitNewVersion={handleCommitNewVersion}
                editorFontSize={settings.editorFontSize}
                enableAutosave={settings.enableAutosave}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>

      </main>

      {/* Decorative page margin footer details */}
      <footer className="w-full text-center py-6 text-2xs font-mono text-slate-600 border-t border-slate-900 mt-20 relative z-10">
        ScriptLayout Studio v2. Secure offline sandbox verification module compiling with HTML5 DOM standards.
      </footer>

      {/* Password-Protected Admin Mode Unlock Modal Overlay */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-950/90  z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-none shadow-sky-500/5 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-2 relative z-10">
              <div className="p-3 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-full">
                <Crown className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-black uppercase text-slate-50 tracking-widest flex items-center gap-1">
                <span>Unlock Admin Panel</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gain administrative authorization to customize, save, edit, duplicate, and delete scripts safely.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adminPasswordInput === 'admin') {
                  setIsAdmin(true);
                  setShowAdminModal(false);
                  setAdminPasswordInput('');
                  setPasswordError('');
                } else {
                  setPasswordError('Incorrect passcode entered. Give "admin" a try.');
                }
              }}
              className="space-y-4 relative z-10"
            >
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-mono font-bold text-slate-500 text-center">Administrator Passcode</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter passcode (e.g. admin)..."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-50 font-mono placeholder-slate-700 focus:outline-none focus:border-slate-500/40 text-center"
                />
                {passwordError && (
                  <p className="text-[10px] text-rose-455 font-mono italic text-center mt-1 text-rose-400">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setAdminPasswordInput('');
                    setPasswordError('');
                  }}
                  className="bg-slate-800 hover:bg-slate-850 text-slate-400 text-[10px] font-mono font-bold py-2 rounded uppercase tracking-wider transition cursor-pointer text-center border border-slate-85"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-500 hover:bg-amber-600 text-slate-950 text-[10px] font-mono font-black py-2 rounded uppercase tracking-wider transition cursor-pointer text-center"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
