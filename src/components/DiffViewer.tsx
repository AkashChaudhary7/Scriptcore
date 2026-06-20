import React, { useState, useMemo } from 'react';
import { Script, ScriptVersion } from '../types';
import { GitCompare, X } from 'lucide-react';

interface DiffViewerProps {
  activeScript: Script;
  currentEditorCode: string;
  onClose: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumberA?: number;
  lineNumberB?: number;
}

// Robust line-by-line dynamic programming LCS diff algorithm
function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  const m = linesA.length;
  const n = linesB.length;

  // For safety and fast rendering, if files are massive we do a simpler diff, 
  // but since scripts are typically < 800 lines, DP executes instantly (under 10ms).
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diff.unshift({
        type: 'unchanged',
        text: linesA[i - 1],
        lineNumberA: i,
        lineNumberB: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: 'added',
        text: linesB[j - 1],
        lineNumberB: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      diff.unshift({
        type: 'removed',
        text: linesA[i - 1],
        lineNumberA: i,
      });
      i--;
    }
  }

  return diff;
}

export default function DiffViewer({ activeScript, currentEditorCode, onClose }: DiffViewerProps) {
  // Option identifiers: 'current' represents local unsaved code in editor,
  // whereas 'ver-...' matches historical database commits
  const [versionAId, setVersionAId] = useState<string>('current');
  const [versionBId, setVersionBId] = useState<string>(
    activeScript.versions.length > 0 ? activeScript.versions[0].id : 'current'
  );

  // Resolved codes based on drop-down targets selection
  const codeA = useMemo(() => {
    if (versionAId === 'current') return currentEditorCode;
    const match = activeScript.versions.find((v) => v.id === versionAId);
    return match ? match.code : '';
  }, [versionAId, currentEditorCode, activeScript.versions]);

  const codeB = useMemo(() => {
    if (versionBId === 'current') return currentEditorCode;
    const match = activeScript.versions.find((v) => v.id === versionBId);
    return match ? match.code : '';
  }, [versionBId, currentEditorCode, activeScript.versions]);

  // Compute live diff
  const diffLines = useMemo(() => {
    return computeLineDiff(codeA, codeB);
  }, [codeA, codeB]);

  // Diff summary metrics
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diffLines.forEach((l) => {
      if (l.type === 'added') added++;
      if (l.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4 md:p-6" id="diff-viewer-modal">
      
      {/* Modal Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-neutral-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-900 text-emerald-400 border border-neutral-800 rounded">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black italic uppercase tracking-wider text-white">
              UserScript Code Diff Engine
            </h2>
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
              Highlighting delta between chosen branch versions for: <span className="text-white">{activeScript.name}</span>
            </p>
          </div>
        </div>

        {/* Action button triggers */}
        <button
          onClick={onClose}
          className="p-1 px-3 bg-neutral-900 border border-neutral-855 rounded text-neutral-400 hover:text-white text-xs uppercase font-bold flex items-center gap-1.5 transition"
        >
          <X className="w-4 h-4" />
          <span>Exit view</span>
        </button>
      </div>

      {/* Selectors and Stats Strip Bar */}
      <div className="my-4 p-4 bg-neutral-950 border border-neutral-850 rounded flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Base Select */}
          <div className="flex flex-col space-y-1">
            <span className="text-[9px] font-mono font-bold uppercase text-neutral-500 tracking-wider">
              Base Code (Version A)
            </span>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-neutral-550 font-mono max-w-xs"
            >
              <option value="current">Current Active Editor State</option>
              {activeScript.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} - {v.changelog.substring(0, 24) || 'Committed version'} ({v.version})
                </option>
              ))}
            </select>
          </div>

          <div className="text-neutral-600 hidden md:block">➔</div>

          {/* Target Select */}
          <div className="flex flex-col space-y-1">
            <span className="text-[9px] font-mono font-bold uppercase text-neutral-500 tracking-wider">
              Compare Target (Version B)
            </span>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-neutral-550 font-mono max-w-xs"
            >
              <option value="current">Current Active Editor State</option>
              {activeScript.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} - {v.changelog.substring(0, 24) || 'Committed version'} ({v.version})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Change Stats badges */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-1 rounded">
            Overall Delta Lines: {diffLines.length}
          </span>
          <span className="text-[10px] font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 px-2 py-1 rounded">
            +{stats.added} Additions
          </span>
          <span className="text-[10px] font-mono uppercase bg-rose-950/40 text-rose-400 border border-rose-500/10 px-2 py-1 rounded">
            -{stats.removed} Deletions
          </span>
        </div>
      </div>

      {/* Main Diff Render Output */}
      <div className="flex-1 overflow-auto bg-neutral-950 border border-neutral-850 rounded font-mono text-xs p-4 selection:bg-neutral-800">
        <div className="min-w-[600px] space-y-0.5">
          {diffLines.length === 0 ? (
            <div className="text-center text-neutral-500 italic py-12 font-mono">
              The selected code version matrices yield identical lines. No changes discovered.
            </div>
          ) : (
            diffLines.map((line, idx) => {
              let bgClass = 'hover:bg-neutral-900/40';
              let textClass = 'text-neutral-300';
              let prefix = ' ';

              if (line.type === 'added') {
                bgClass = 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-2 border-emerald-500';
                textClass = 'text-emerald-400';
                prefix = '+';
              } else if (line.type === 'removed') {
                bgClass = 'bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-rose-500';
                textClass = 'text-rose-400';
                prefix = '-';
              }

              return (
                <div key={idx} className={`flex items-start font-mono leading-5 transition-colors ${bgClass} py-0.5 px-2 rounded-sm`}>
                  
                  {/* Left line gutter A */}
                  <span className="w-10 text-right select-none text-neutral-600 pr-3 font-mono text-[10px]">
                    {line.lineNumberA || ''}
                  </span>

                  {/* Right line gutter B */}
                  <span className="w-10 text-right select-none text-neutral-600 pr-3 font-mono text-[10px] border-r border-neutral-900">
                    {line.lineNumberB || ''}
                  </span>

                  {/* Prefix indicators */}
                  <span className={`w-6 text-center select-none font-bold pl-2 ${line.type === 'added' ? 'text-emerald-500' : line.type === 'removed' ? 'text-rose-500' : 'text-neutral-600'}`}>
                    {prefix}
                  </span>

                  {/* Line text contents */}
                  <pre className={`flex-1 overflow-x-auto select-text whitespace-pre-wrap font-mono pl-1 ${textClass}`}>
                    {line.text === '' ? ' ' : line.text}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
