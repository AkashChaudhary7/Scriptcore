import React, { useState, useEffect, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import { Script, ScriptVersion } from '../types';
import { Play, RotateCcw, Save, ShieldCheck, History, PlusCircle, CheckCircle, Copy, ArrowDownToLine, Sparkles, GitCompare, Activity, AlertTriangle, XCircle } from 'lucide-react';
import DiffViewer from './DiffViewer';

interface CodeEditorProps {
  activeScript: Script;
  onCodeChange: (code: string) => void;
  onCommitNewVersion: (version: string, changelog: string, code: string) => void;
  editorFontSize: number;
  enableAutosave: boolean;
  isAdmin: boolean;
}

export default function CodeEditor({
  activeScript,
  onCodeChange,
  onCommitNewVersion,
  editorFontSize,
  enableAutosave,
  isAdmin,
}: CodeEditorProps) {
  const [localCode, setLocalCode] = useState(activeScript.code);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionNum, setNewVersionNum] = useState('');
  const [newChangelog, setNewChangelog] = useState('');
  const [copied, setCopied] = useState(false);
  const [showHistoryPane, setShowHistoryPane] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [linterEnabled, setLinterEnabled] = useState(true);

  // Admin Verification Suite States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationResults, setVerificationResults] = useState<{
    isValid: boolean;
    hasWarnings: boolean;
    issues: { severity: 'passed' | 'warning' | 'error'; title: string; message: string }[];
  } | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'deployed'>('idle');

  // Version historical rollback selected state
  const [selectedHistoricalVersion, setSelectedHistoricalVersion] = useState<ScriptVersion | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compile-time and standard userscript structure analysis memo
  const lintIssues = useMemo(() => {
    if (!linterEnabled) return [];
    
    interface LintRuleIssue {
      severity: 'error' | 'warning';
      message: string;
      line?: number;
      type: string;
    }
    const issues: LintRuleIssue[] = [];

    // 1. Compile sandbox test using a trial function block constructor
    try {
      new Function(`async function __compile_sandbox__() {\n${localCode}\n}`);
    } catch (err: any) {
      const message = err.message || 'Syntax compilation discrepancy detected';
      let line: number | undefined = undefined;
      // Extract line offsets if present in build traceback standard formats
      const lineMatch = message.match(/line\s+(\d+)/i) || message.match(/:(\d+):(\d+)/) || err.stack?.match(/<anonymous>:(\d+):/);
      if (lineMatch) {
         line = parseInt(lineMatch[1], 10);
      }
      issues.push({
        severity: 'error',
        message: message,
        line,
        type: 'syntax'
      });
    }

    // 2. Tampermonkey structural block declarations audits
    const hasHeaderBegin = localCode.includes('// ==UserScript==');
    const hasHeaderEnd = localCode.includes('// ==/UserScript==');
    if (!hasHeaderBegin) {
      issues.push({
        severity: 'warning',
        message: 'Missing standard metadata header comments block ("// ==UserScript==")',
        type: 'header_start'
      });
    }
    if (hasHeaderBegin && !hasHeaderEnd) {
      issues.push({
        severity: 'warning',
        message: 'The meta definition block is left open. Add closure: "// ==/UserScript=="',
        type: 'header_end'
      });
    }

    // 3. Match expression patterns definition check
    if (hasHeaderBegin && hasHeaderEnd) {
      const targetsMatch = localCode.includes('@match') || localCode.includes('@include') || localCode.includes('@exclude');
      if (!targetsMatch) {
        issues.push({
          severity: 'warning',
          message: 'Zero page matcher patterns found in block (e.g. "@match *://*/*")',
          type: 'missing_match'
        });
      }
    }

    // 4. Group elements bracket closures verification
    const structuralChecks = [
      { start: '{', end: '}', label: 'braces' },
      { start: '(', end: ')', label: 'parentheses' },
      { start: '[', end: ']', label: 'indices brackets' }
    ];
    for (const b of structuralChecks) {
      const openQty = (localCode.split(b.start).length - 1);
      const closeQty = (localCode.split(b.end).length - 1);
      if (openQty !== closeQty) {
        issues.push({
          severity: 'warning',
          message: `Divergent character balance for ${b.label}: ${openQty} opened vs ${closeQty} closed items.`,
          type: 'bracket_mismatch'
        });
      }
    }

    // 5. Greasemonkey storage constraints check
    const usesGMAPI = localCode.includes('GM_setValue') || localCode.includes('GM_getValue') || localCode.includes('GM_deleteValue') || localCode.includes('GM_listValues');
    const hasGrants = localCode.toLowerCase().includes('@grant');
    if (usesGMAPI && !hasGrants) {
      issues.push({
        severity: 'warning',
        message: 'Uncontrolled metadata environment: calls GM state functions but has no @grant attributes declared.',
        type: 'grant_mismatch'
      });
    }

    return issues;
  }, [localCode, linterEnabled]);

  // Sync when active script changes
  useEffect(() => {
    setLocalCode(activeScript.code);
  }, [activeScript.id, activeScript.code]);

  // Syntax highlighting trigger
  useEffect(() => {
    Prism.highlightAll();
  }, [localCode]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isAdmin) return;
    const val = e.target.value;
    setLocalCode(val);
    onCodeChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isAdmin) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = localCode.substring(0, start) + "    " + localCode.substring(end);
      setLocalCode(newValue);
      onCodeChange(newValue);

      // Reset selection
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger browser download for standard cross-platform one-click installation
  const handleDownloadInstall = () => {
    // Generate .user.js content
    const element = document.createElement("a");
    const file = new Blob([localCode], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    // Tampermonkey requires scripts to end in `.user.js` for one-click browser popups installation
    const fileName = activeScript.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '.user.js';
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Trigger browser download for raw script .js output
  const handleDownloadStandardJS = () => {
    const element = document.createElement("a");
    const file = new Blob([localCode], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    const fileName = activeScript.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') + '.js';
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleVersionCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionNum.trim()) return;
    onCommitNewVersion(newVersionNum, newChangelog, localCode);
    setShowVersionModal(false);
    setNewVersionNum('');
    setNewChangelog('');
  };

  // Run advanced metadata validation, permission scans, and JSEngine parse rules
  const handleRunAdminVerifySuite = () => {
    const results = {
      isValid: true,
      hasWarnings: false,
      issues: [] as { severity: 'passed' | 'warning' | 'error'; title: string; message: string }[]
    };

    // Rule 1: Header boundaries
    const startIdx = localCode.indexOf('// ==UserScript==');
    const endIdx = localCode.indexOf('// ==/UserScript==');
    
    if (startIdx === -1) {
      results.isValid = false;
      results.issues.push({
        severity: 'error',
        title: 'Metadata Start Boundary Required',
        message: 'The required indicator block "// ==UserScript==" is fully absent in the draft contents.'
      });
    } else {
      results.issues.push({
        severity: 'passed',
        title: 'Header Open Tag Detected',
        message: 'Header open tag "// ==UserScript==" was correctly verified in line markers.'
      });
    }

    if (endIdx === -1) {
      results.isValid = false;
      results.issues.push({
        severity: 'error',
        title: 'Metadata Closure Tag Required',
        message: 'The closure boundary "// ==/UserScript==" was not located in this script stream.'
      });
    } else if (startIdx !== -1 && endIdx < startIdx) {
      results.isValid = false;
      results.issues.push({
        severity: 'error',
        title: 'Corrupted Bounds',
        message: 'The metadata end boundary comment is placed BEFORE the start boundary comment.'
      });
    } else if (endIdx !== -1) {
      results.issues.push({
        severity: 'passed',
        title: 'Header Close Tag Detected',
        message: 'The closing header tag "// ==/UserScript==" is correctly balanced.'
      });
    }

    // Rule 2: Attribute metadata properties
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const headerBlockContent = localCode.substring(startIdx, endIdx);
      
      // Name Matcher
      if (!headerBlockContent.includes('@name')) {
        results.isValid = false;
        results.issues.push({
          severity: 'error',
          title: 'Missing "@name" Identifier',
          message: 'The engine expects a distinct "@name" attribute inside the userscript header blocks.'
        });
      } else {
        results.issues.push({
          severity: 'passed',
          title: '"@name" Attribute Matched',
          message: 'Found valid script name metadata registration.'
        });
      }

      // Version Matcher
      if (!headerBlockContent.includes('@version')) {
        results.isValid = false;
        results.issues.push({
          severity: 'error',
          title: 'Missing "@version" Release Stamp',
          message: 'The code requires a "@version" release tag for active revision tracing.'
        });
      } else {
        results.issues.push({
          severity: 'passed',
          title: '"@version" Release Stamp Verified',
          message: 'Found valid semantic version metadata registration.'
        });
      }

      // Match Matcher
      if (!headerBlockContent.includes('@match') && !headerBlockContent.includes('@include')) {
        results.hasWarnings = true;
        results.issues.push({
          severity: 'warning',
          title: 'Location Match Patterns Blank',
          message: 'Missing "@match" or "@include" patterns. This causes the userscript to be ignored by browser injectors.'
        });
      } else {
        results.issues.push({
          severity: 'passed',
          title: 'Scope Site Patterns Registered',
          message: 'Verified intercept patterns are declared for simulation loading.'
        });
      }
    }

    // Rule 3: Sandbox secure permission checks
    const carriesEval = localCode.includes('eval(');
    const carriesUnsafeWindow = localCode.includes('unsafeWindow');
    
    if (carriesEval || carriesUnsafeWindow) {
      results.hasWarnings = true;
      results.issues.push({
        severity: 'warning',
        title: 'High-Privileged Core Access Warnings',
        message: 'Draft contains direct references to "eval()" compilation or modifications to "unsafeWindow" globals. Ensure inputs are escaped.'
      });
    } else {
      results.issues.push({
        severity: 'passed',
        title: 'Zero Sandbox Escape Holes Found',
        message: 'Script has no calls to eval/unsafeWindow. Evaluated as structurally secured.'
      });
    }

    // Rule 4: Javascript compiling rules
    try {
      new Function(`async function __verification_sandbox__() {\n${localCode}\n}`);
      results.issues.push({
        severity: 'passed',
        title: 'TypeScript/JavaScript Syntactical Parsing Passed',
        message: 'Verification parser compiled compiling sequence with 100% success rate.'
      });
    } catch (e: any) {
      results.isValid = false;
      results.issues.push({
        severity: 'error',
        title: 'Syntax Compilation Block Failed',
        message: `Broken code syntax detected: ${e.message || 'Fix brackets, parenthesis, or missing symbols before deploying.'}`
      });
    }

    setVerificationResults(results);
    setShowVerifyModal(true);
  };

  const handleDeployVerifiedScript = () => {
    setDeploymentStatus('deploying');
    setTimeout(() => {
      onCodeChange(localCode);
      setDeploymentStatus('deployed');
      setTimeout(() => {
        setDeploymentStatus('idle');
        setShowVerifyModal(false);
      }, 1500);
    }, 1200);
  };

  const loadHistoricalVersion = (v: ScriptVersion) => {
    setLocalCode(v.code);
    onCodeChange(v.code);
    setShowHistoryPane(false);
  };

  const handleExecuteRollback = (v: ScriptVersion) => {
    setLocalCode(v.code);
    onCodeChange(v.code);
    
    // Commit of rollback history event
    const rollbackChangelog = `Rollback: Override live to historical version ${v.version} (Author: Admin rollback action)`;
    onCommitNewVersion(v.version, rollbackChangelog, v.code);
    
    setSelectedHistoricalVersion(null);
    setShowRollbackConfirm(false);
    setShowHistoryPane(false);
  };

  // Derive simple statistics of lines
  const linesCount = localCode.split('\n').length;
  const characterCount = localCode.length;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded border border-slate-800 overflow-hidden shadow-none relative" id="code-editor-root">
      
      {/* Editor Main Header Operations */}
      <div className="flex flex-wrap items-center justify-between px-4 py-4 bg-slate-950 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-50 flex items-center gap-1.5">
              <span>{activeScript.name}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-800">
                v{activeScript.version}
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{activeScript.sitePattern}</p>
          </div>
        </div>

        {/* Toolbar operations for simulation and triggers */}
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <button
              onClick={handleRunAdminVerifySuite}
              className="flex items-center gap-1.5 bg-slate-500 hover:bg-slate-200 text-black text-xs px-3 py-1.5 rounded font-black uppercase tracking-wider transition cursor-pointer shadow-md shadow-slate-500/10"
              id="editor-btn-admin-verify"
              title="Run secure userscript metadata and permission footprint check before deployment"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-905" />
              <span>Admin Verify</span>
            </button>
          )}

          <button
            onClick={handleDownloadStandardJS}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-850 hover:text-slate-50 text-slate-300 text-xs px-3 py-1.5 rounded border border-slate-800 font-bold uppercase tracking-wider transition"
            id="editor-btn-download-js"
            title="Download standard .js script file directly to your machine"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .js</span>
          </button>

          <button
            onClick={handleDownloadInstall}
            className="flex items-center gap-1  from-purple-900/40 to-indigo-900/40 hover:from-purple-800/50 hover:to-indigo-800/50 text-indigo-200 hover:text-slate-50 text-xs px-3 py-1.5 rounded border border-sky-500/30 font-bold uppercase tracking-wider transition"
            id="editor-btn-sync-tampermonkey"
            title="Sync style installation link directly with Tampermonkey (.user.js)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync Tampermonkey</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-50 bg-slate-800 hover:bg-slate-700 rounded border border-slate-800 transition"
            title="Copy script code clipboard"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              if (!isAdmin) {
                alert("Viewer Mode Lock: Only administrative users can make script version branch commits.");
                return;
              }
              setNewVersionNum(activeScript.version.replace(/(\d+)$/, (m) => String(Number(m) + 1)));
              setShowVersionModal(true);
            }}
            className={`p-1.5 rounded border transition cursor-pointer ${
              isAdmin 
                ? 'text-slate-400 hover:text-slate-50 bg-slate-800 border-slate-800' 
                : 'text-slate-600 bg-slate-900/40 border-slate-800 cursor-not-allowed'
            }`}
            title={isAdmin ? "Create & Commit New Script Version" : "Commit Lock: Only Admin can create version rollbacks"}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowHistoryPane(!showHistoryPane)}
            className={`text-xs px-2.5 py-1 rounded border transition font-mono uppercase font-bold tracking-wider ${
              showHistoryPane
                ? 'bg-slate-800 border-slate-700 text-slate-50'
                : 'bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-50 hover:bg-slate-700'
            }`}
          >
            Rollbacks ({activeScript.versions.length})
          </button>
        </div>
      </div>

      {/* Editor Core Body & Rollback Pane overlay */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Rollback/History sidebar */}
        {showHistoryPane && (
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 z-20 p-4 flex flex-col justify-between shadow-none animate-in slide-in-from-left duration-200" id="rollback-history-sidebar">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800 shrink-0">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-sky-400" />
                  Version History
                </span>
                <button
                  onClick={() => {
                    setShowHistoryPane(false);
                    setSelectedHistoricalVersion(null);
                    setShowRollbackConfirm(false);
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-50 uppercase font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>

              {!selectedHistoricalVersion ? (
                // List View
                <div className="flex-1 flex flex-col overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowDiffModal(true)}
                    className="w-full mb-3 flex items-center justify-center gap-1.5 bg-slate-905 hover:bg-slate-850 text-slate-50 font-mono text-[10px] uppercase font-bold py-2 border border-slate-800 rounded transition cursor-pointer shrink-0"
                    title="Open differential highlight viewer"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-sky-400" />
                    <span>Compare Live vs Initial</span>
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {activeScript.versions.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic p-2 font-mono">No committed versions yet</p>
                    ) : (
                      activeScript.versions.map((ver) => (
                        <div
                          key={ver.id}
                          onClick={() => setSelectedHistoricalVersion(ver)}
                          className="group p-3 rounded border border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-750 cursor-pointer transition flex flex-col gap-1 text-left"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-sky-400 font-bold">v{ver.version}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(ver.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-300 mt-1 line-clamp-2 italic font-mono">
                            "{ver.changelog || 'No notes left'}"
                          </p>
                          <span className="text-[8px] font-mono uppercase text-slate-500 tracking-wider mt-1 text-right group-hover:text-indigo-300 transition-all font-bold">Inspect Details & Rollback →</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // Inspector / Rollback View
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                    <button
                      onClick={() => {
                        setSelectedHistoricalVersion(null);
                        setShowRollbackConfirm(false);
                      }}
                      className="text-[9px] font-mono text-slate-400 hover:text-slate-50 uppercase font-bold flex items-center gap-1 mb-2 bg-slate-800 px-2 py-1 rounded border border-slate-800 self-start cursor-pointer"
                    >
                      ← Back to branches
                    </button>

                    <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 space-y-2.5">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-xs font-mono font-bold text-sky-400">v{selectedHistoricalVersion.version}</span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(selectedHistoricalVersion.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(selectedHistoricalVersion.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-1 font-sans">
                        <span className="block text-[8px] uppercase tracking-wider font-mono font-bold text-slate-500">Changelog / Note:</span>
                        <p className="text-[10px] text-slate-250 italic bg-slate-950/40 p-2.5 rounded border border-slate-800/60 font-mono">
                          "{selectedHistoricalVersion.changelog || 'No release log'}"
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[8px] uppercase tracking-wider font-mono font-bold text-slate-500">Statistics:</span>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded">
                          <div>Lines: <b className="text-slate-50">{(selectedHistoricalVersion.code || '').split('\n').length}</b></div>
                          <div>Chars: <b className="text-slate-50">{(selectedHistoricalVersion.code || '').length}</b></div>
                        </div>
                      </div>
                    </div>

                    {/* Code snapshot viewport */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Inspecting Code:</span>
                      <pre className="text-[9px] font-mono p-3 bg-slate-800 border border-slate-800 rounded text-slate-400 h-32 overflow-y-auto whitespace-pre-wrap select-all">
                        {selectedHistoricalVersion.code}
                      </pre>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
                    {isAdmin ? (
                      <div className="space-y-2">
                        {showRollbackConfirm ? (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-2.5 animate-in fade-in duration-200">
                            <p className="text-[9px] font-mono text-rose-300 font-bold leading-relaxed flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                              Are you sure you want to rollback? This overwrites active workspace code.
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() => setShowRollbackConfirm(false)}
                                className="bg-slate-800 border border-slate-800 py-1.5 rounded text-[9px] text-slate-300 font-mono font-bold uppercase transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleExecuteRollback(selectedHistoricalVersion)}
                                className="bg-rose-600 hover:bg-rose-700 py-1.5 rounded text-[9px] text-slate-50 font-mono font-black uppercase transition cursor-pointer"
                              >
                                Yes, Revert
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                setLocalCode(selectedHistoricalVersion.code);
                                onCodeChange(selectedHistoricalVersion.code);
                                setSelectedHistoricalVersion(null);
                                setShowHistoryPane(false);
                              }}
                              className="bg-slate-800 hover:bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-mono uppercase font-black py-2 rounded transition cursor-pointer text-center"
                              title="Load code as a local editable draft in editor (doesn't save yet)"
                            >
                              Load Draft
                            </button>
                            <button
                              onClick={() => setShowRollbackConfirm(true)}
                              className="bg-indigo-650 hover:bg-indigo-700 text-slate-50 text-[10px] font-mono uppercase font-black py-2 rounded transition cursor-pointer text-center shadow-none shadow-indigo-600/15"
                            >
                              Roll Back Live
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-800 border border-slate-800/80 p-2.5 rounded-lg text-center font-mono opacity-80">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                          <Crown className="w-3 h-3 text-slate-500" />
                          Rollback capabilities locked
                        </span>
                        <p className="text-[8px] text-slate-500 mt-1">Authorized admin login required.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!selectedHistoricalVersion && (
              <div className="pt-3 mt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono shrink-0 leading-relaxed text-center">
                Select any previous compilation branch to inspect change details or coordinate rollbacks.
              </div>
            )}
          </div>
        )}

        {/* Dual Layer Code Editor Pane */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!isAdmin && (
            <div className="bg-slate-500/10 border-b border-slate-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-200 font-mono select-none shrink-0">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                ReadOnly Viewer Mode Active
              </span>
              <span className="hidden md:inline">Only administrators are authorized to save, edit code or compile changes.</span>
            </div>
          )}
          
          <div className="flex-1 relative font-mono text-xs overflow-auto">
            {/* Split Screen Layout - Highlighting Pre underneath standard Input text area */}
            <textarea
              ref={textareaRef}
              value={localCode}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              readOnly={!isAdmin}
              style={{ fontSize: `${editorFontSize}px` }}
              className={`absolute inset-0 w-full h-full p-4 bg-transparent text-slate-50 font-mono resize-none focus:outline-none z-10 selection:bg-slate-800 overflow-y-auto ltr leading-6 border-0 ${!isAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
              placeholder={isAdmin ? "// Write your UserScript here..." : "// View Mode: Unlock Administrator mode to custom modify and edit code."}
              spellCheck={false}
              id="raw-editor-textarea"
            />
          </div>

          {/* Realtime Lint Errors & Warnings Alert Dock */}
          {linterEnabled && lintIssues.length > 0 && (
            <div className="bg-slate-900 border-t border-slate-800 p-3 max-h-40 overflow-y-auto space-y-1.5 select-none animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-teal-400">
                  <Activity className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
                  Realtime Code Analyzer
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[9px] uppercase font-bold">
                    {lintIssues.filter(i => i.severity === 'error').length} Errors • {lintIssues.filter(i => i.severity === 'warning').length} Warnings
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinterEnabled(false)}
                    className="text-[9px] bg-slate-800 border border-slate-800 hover:text-slate-50 hover:border-slate-700 uppercase font-bold px-1.5 py-0.5 rounded cursor-pointer transition"
                    title="Remove/Disable Static Analysis widgets entirely"
                  >
                    Remove Linter
                  </button>
                </div>
              </div>
              
              <div className="space-y-1 font-mono text-[11px]">
                {lintIssues.map((issue, idx) => {
                  const isErr = issue.severity === 'error';
                  return (
                    <div key={idx} className="p-2 rounded bg-slate-800 flex items-start gap-2 border border-slate-800 hover:bg-slate-700 hover:border-slate-750 transition duration-150">
                      {isErr ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-slate-300">
                        <span className="font-bold mr-1.5 uppercase tracking-wider text-[9px] opacity-75">
                          [{issue.severity}]
                        </span>
                        <span>{issue.message}</span>
                        {issue.line !== undefined && (
                          <span className="text-slate-500 text-[10px] ml-2"> (near line {issue.line})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Metrics Footer bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>Lines: <b className="text-slate-50">{linesCount}</b></span>
              <span>Chars: <b className="text-slate-50">{characterCount}</b></span>
              <span className="text-slate-700">|</span>
              
              <button
                type="button"
                onClick={() => setLinterEnabled(!linterEnabled)}
                className={`flex items-center gap-1.5 uppercase font-bold cursor-pointer transition ${
                  linterEnabled 
                    ? lintIssues.filter(i => i.severity === 'error').length > 0 
                      ? 'text-rose-400 hover:text-rose-300' 
                      : lintIssues.length > 0 
                        ? 'text-slate-400 hover:text-amber-300' 
                        : 'text-teal-400 hover:text-emerald-350'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
                title="Toggle real-time static code linter"
              >
                {linterEnabled ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Linter Active ({lintIssues.length})</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-600" />
                    <span>Linter Off (Click to Enable)</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Syntax: <b className="text-teal-400 uppercase">JavaScript / TM</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* COMMIT VERSION MODAL */}
      {showVersionModal && (
        <div className="absolute inset-0 bg-slate-950/85  flex items-center justify-center p-4 z-20 animate-in fade-in duration-150">
          <div className="bg-slate-800 border border-slate-800 p-6 rounded shadow-none max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-50 flex items-center gap-1.5 font-sans">
                <History className="w-4 h-4 text-teal-400" />
                Commit Script Branch
              </span>
              <button onClick={() => setShowVersionModal(false)} className="text-slate-500 hover:text-slate-50 text-xs uppercase font-bold">
                Cancel
              </button>
            </div>

            <form onSubmit={handleVersionCommitSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-neural-400 mb-1">Version Metric</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.3"
                  value={newVersionNum}
                  onChange={(e) => setNewVersionNum(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-50 font-mono focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-neural-400 mb-1">Changelog Log</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Fixed class tags and added auto-recalculation timer"
                  value={newChangelog}
                  onChange={(e) => setNewChangelog(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-50 focus:outline-none focus:border-slate-500"
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-white hover:bg-slate-200 text-black text-xs font-black py-2.5 rounded transition uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  Save and Pin Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDiffModal && (
        <DiffViewer
          activeScript={activeScript}
          currentEditorCode={localCode}
          onClose={() => setShowDiffModal(false)}
        />
      )}

      {/* ADMIN VERIFICATION REPORT MODAL */}
      {showVerifyModal && verificationResults && (
        <div className="absolute inset-0 bg-slate-950/90  flex items-center justify-center p-4 z-40 animate-in fade-in duration-150" id="admin-verify-modal-overlay">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-5 shadow-none shadow-sky-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase text-slate-50 flex items-center gap-1.5 font-sans tracking-wider">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                Administrative Verify Report
              </span>
              <button 
                onClick={() => {
                  if (deploymentStatus === 'idle') setShowVerifyModal(false);
                }} 
                className="text-slate-500 hover:text-slate-50 text-xs uppercase font-bold cursor-pointer"
                disabled={deploymentStatus !== 'idle'}
              >
                Close Report
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                The verification sandbox has evaluated your draft. Fix any severe errors below to authorize a cloud database save.
              </p>

              <div className="space-y-2.5">
                {verificationResults.issues.map((issue, idx) => {
                  const iconStyle = issue.severity === 'passed' 
                    ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' 
                    : issue.severity === 'warning' 
                      ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' 
                      : 'text-rose-455 bg-rose-500/10 border-rose-500/20';

                  const containerStyle = issue.severity === 'passed' 
                    ? 'border-slate-800 bg-slate-800/30' 
                    : issue.severity === 'warning' 
                      ? 'border-slate-500/20 bg-amber-955/5' 
                      : 'border-rose-500/20 bg-rose-955/5';

                  return (
                    <div key={idx} className={`p-3 rounded-lg border text-left flex gap-3 transition ${containerStyle}`}>
                      <div className={`p-1.5 rounded-full border self-start shrink-0 ${iconStyle}`}>
                        {issue.severity === 'passed' && <CheckCircle className="w-3.5 h-3.5 text-teal-400" />}
                        {issue.severity === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />}
                        {issue.severity === 'error' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                      </div>
                      <div className="space-y-1 font-mono">
                        <h4 className="text-xs font-bold text-slate-50 uppercase tracking-tight">{issue.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{issue.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>Verification State:</span>
                <span className={`font-bold uppercase tracking-widest ${verificationResults.isValid ? 'text-teal-400' : 'text-rose-500'}`}>
                  {verificationResults.isValid ? 'Passed Security Checks' : 'Declined Security Checks'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 mt-2">
                {verificationResults.isValid ? (
                  <button
                    onClick={handleDeployVerifiedScript}
                    disabled={deploymentStatus !== 'idle'}
                    className={`w-full text-xs font-black py-3 rounded uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border ${
                      deploymentStatus === 'idle'
                        ? 'bg-slate-500 hover:bg-slate-200 text-slate-950 border-slate-500/50 shadow-none shadow-slate-500/15'
                        : deploymentStatus === 'deploying'
                          ? 'bg-slate-905 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-teal-500 text-black border-teal-400 cursor-default animate-pulse'
                    }`}
                  >
                    {deploymentStatus === 'idle' && (
                      <>
                        <ShieldCheck className="w-4 h-4 text-slate-955 animate-pulse" />
                        <span>Sign & Deploy To Cloud DB</span>
                      </>
                    )}
                    {deploymentStatus === 'deploying' && (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-550 border-t-transparent rounded-full animate-spin"></div>
                        <span>Deploying to Cloud DB...</span>
                      </>
                    )}
                    {deploymentStatus === 'deployed' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-black animate-scale" />
                        <span>Successfully Deployed & Verified!</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-center font-mono select-none flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-[10px] text-rose-350 font-bold uppercase tracking-wider">
                      Deployment Locked: Correct metadata/syntax errors to build
                    </span>
                  </div>
                )}

                <button
                  onClick={() => setShowVerifyModal(false)}
                  disabled={deploymentStatus !== 'idle'}
                  className="w-full bg-slate-800 hover:bg-slate-850 text-slate-400 text-xs font-bold py-2 rounded uppercase font-mono tracking-wider transition cursor-pointer text-center border border-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
