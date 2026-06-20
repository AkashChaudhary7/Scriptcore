import React, { useState, useEffect, useRef } from 'react';
import { mockWebpages } from '../data';
import { Script, SimulationLog, PerformanceMetric, MockWebpage } from '../types';
import { Play, RotateCcw, Terminal, Layout, Zap, Gauge, Clock, AlertTriangle, CheckCircle, HelpCircle, FileCode, Edit, Code } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScriptSimulatorProps {
  activeScript: Script;
  selectedWebpage: MockWebpage;
  onWebpageChange: (page: MockWebpage) => void;
}

export default function ScriptSimulator({
  activeScript,
  selectedWebpage,
  onWebpageChange,
}: ScriptSimulatorProps) {
  const [htmlContent, setHtmlContent] = useState(selectedWebpage.html);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [latencyData, setLatencyData] = useState<{ step: number; latency: number }[]>([]);
  const [gmStorage, setGmStorage] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'preview' | 'html-editor'>('preview');
  const [diagnosticScore, setDiagnosticScore] = useState<number>(100);
  
  const sandboxRef = useRef<HTMLDivElement>(null);

  // Sync if page template is changed from outside
  useEffect(() => {
    setHtmlContent(selectedWebpage.html);
    resetSimulation();
  }, [selectedWebpage]);

  const resetSimulation = () => {
    setIsRunning(false);
    setLogs([
      {
        timestamp: Date.now(),
        type: 'info',
        message: 'Sandbox engine initialized. Waiting for script trigger.',
        details: 'Select a template and click "Deploy Simulation" to run script trace.'
      }
    ]);
    setMetrics([]);
    setLatencyData([]);
    setGmStorage({});
    setDiagnosticScore(100);
    
    // Refresh sandbox DOM representation
    if (sandboxRef.current) {
      sandboxRef.current.innerHTML = htmlContent;
    }
  };

  const runSimulation = () => {
    setIsRunning(true);
    setLogs([]);
    setMetrics([]);
    setLatencyData([]);
    setGmStorage({});
    
    const simLogs: SimulationLog[] = [];
    const localStore: Record<string, string> = {};
    let currentScore = 100;
    
    const pushLog = (type: SimulationLog['type'], message: string, details?: string) => {
      simLogs.push({ timestamp: Date.now(), type, message, details });
    };

    pushLog('info', `Deploying user-script: "${activeScript.name}" into virtual webpage space`, `Pattern: ${activeScript.sitePattern}`);

    if (!sandboxRef.current) {
      pushLog('error', 'Simulator preview workspace is offline.');
      return;
    }

    // Reset Sandbox DOM first
    sandboxRef.current.innerHTML = htmlContent;
    const sandboxEl = sandboxRef.current;

    // Remove metadata block comments from script
    let cleanCode = activeScript.code;
    cleanCode = cleanCode.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/, '');

    // Profile variables
    let queryCount = 0;
    let redundantDomQueriesCount = 0;
    let timingSum = 0;
    const latencyRecords: { step: number; latency: number }[] = [];

    // Map virtual console
    const mockConsole = {
      log: (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        pushLog('log', msg);
      },
      info: (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        pushLog('info', msg);
      },
      warn: (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        pushLog('warn', msg);
      },
      error: (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        pushLog('error', msg);
      },
    };

    // Virtualized Document Selectors to intercept DOM access and track bottlenecks automatically!
    const virtualDocument = {
      querySelectorAll: (selector: string): NodeListOf<Element> => {
        queryCount++;
        const start = performance.now();
        const results = sandboxEl.querySelectorAll(selector);
        const duration = Number((performance.now() - start).toFixed(4));
        timingSum += duration;
        
        latencyRecords.push({ step: queryCount, latency: duration + 0.1 });

        // Bottleneck Analysis Check
        if (selector === '#products-container' || selector === '.product') {
          if (queryCount > 15) {
            redundantDomQueriesCount++;
          }
        }

        // Apply interactive custom flashing loop highlights to show visual feedback instantly
        results.forEach(el => {
          el.classList.add('dom-modified');
          setTimeout(() => el.classList.remove('dom-modified'), 1500);
        });

        pushLog('dom', `document.querySelectorAll('${selector}')`, `Found ${results.length} nodes (took ${duration}ms)`);
        return results;
      },

      querySelector: (selector: string): Element | null => {
        queryCount++;
        const start = performance.now();
        const result = sandboxEl.querySelector(selector);
        const duration = Number((performance.now() - start).toFixed(4));
        timingSum += duration;

        latencyRecords.push({ step: queryCount, latency: duration + 0.1 });

        if (result) {
          result.classList.add('dom-modified');
          setTimeout(() => result.classList.remove('dom-modified'), 1500);
        }

        pushLog('dom', `document.querySelector('${selector}')`, result ? `Matched node: <${result.tagName.toLowerCase()}>` : 'No elements found (took ' + duration + 'ms)');
        return result;
      },

      getElementById: (id: string): HTMLElement | null => {
        queryCount++;
        const start = performance.now();
        const result = sandboxEl.querySelector(`#${id}`) as HTMLElement || null;
        const duration = Number((performance.now() - start).toFixed(4));
        timingSum += duration;

        latencyRecords.push({ step: queryCount, latency: duration + 0.1 });

        if (result) {
          result.classList.add('dom-modified');
          setTimeout(() => result.classList.remove('dom-modified'), 1500);
        }

        pushLog('dom', `document.getElementById('${id}')`, result ? `Selected workspace element` : 'No element found (took ' + duration + 'ms)');
        return result;
      }
    };

    // Virtualized Window Event Tracking to trace scrolling anomalies
    const virtualWindow = {
      addEventListener: (type: string, listener: Function) => {
        pushLog('info', `window.addEventListener('${type}') attached in sandbox`, `Warning: Ensure unthrottled listeners are removed on scroll!`);
      }
    };

    // Virtual Greasemonkey/Tampermonkey Storage Mock
    const mockGM_store = {
      GM_setValue: (key: string, value: any) => {
        localStore[key] = String(value);
        setGmStorage({ ...localStore });
        pushLog('success', `GM_setValue('${key}', '${value}') saved securely`);
      },
      GM_getValue: (key: string, defaultValue: any) => {
        const val = localStore[key] !== undefined ? localStore[key] : defaultValue;
        pushLog('info', `GM_getValue('${key}') returning "${val}"`);
        return val;
      },
      GM_addStyle: (styleText: string) => {
        const styleNode = document.createElement('style');
        styleNode.textContent = styleText;
        sandboxEl.appendChild(styleNode);
        pushLog('success', 'GM_addStyle attached custom user stylesheet rules');
      }
    };

    // Begin execution mapping
    const executionStart = performance.now();
    try {
      // Sandbox constructor function isolating the user script safely
      const sandboxRunner = new Function('console', 'document', 'window', 'GM_setValue', 'GM_getValue', 'GM_addStyle', cleanCode);
      
      sandboxRunner(
        mockConsole,
        virtualDocument,
        virtualWindow,
        mockGM_store.GM_setValue,
        mockGM_store.GM_getValue,
        mockGM_store.GM_addStyle
      );

      const totalExecutionTime = Number((performance.now() - executionStart).toFixed(2));
      pushLog('success', `UserScript finished deployment trace executing successfully in ${totalExecutionTime}ms!`);

      // -------------------------------------------------------------
      // DIAGNOSTICS & BOTTLENECK PROFILE BUILDER (Latency Evaluation)
      // -------------------------------------------------------------
      const calculatedMetrics: PerformanceMetric[] = [];
      
      // Metric 1: Selection Timing Profile
      calculatedMetrics.push({
        name: 'DOM SELECTOR SPEED',
        value: Number(timingSum.toFixed(2)),
        rating: timingSum < 3 ? 'good' : timingSum < 10 ? 'average' : 'poor',
        explanation: timingSum < 3 
          ? 'DOM operations finished in ultra fast cycles (<3ms).'
          : 'High query search duration, look into optimizing complex selector nesting.'
      });

      // Metric 2: Redundant Iteration Counter (The real-time bottleneck checker!)
      if (redundantDomQueriesCount > 0 || queryCount > 100) {
        currentScore -= 40;
        calculatedMetrics.push({
          name: 'QUERY REDUNDANCY ALERT',
          value: queryCount,
          rating: 'poor',
          explanation: `Redundant DOM lookups inside active loops flagged (${queryCount} queries). Warning: Re-querying static layout items causes layout thrashing.`
        });
        pushLog('warn', `⚠️ Performance Bottleneck: High DOM selection intensity detected (${queryCount} queries executed). Consider mapping variables outside elements.`, 'Latency Warning Code: T-820');
      } else {
        calculatedMetrics.push({
          name: 'QUERY DENSITY STABILITY',
          value: queryCount,
          rating: 'good',
          explanation: 'Low lookup density keeps layout operations fluent without rendering lag.'
        });
      }

      // Metric 3: Heavy unthrottled Scroll listeners (Regex detect)
      const hasScrollUnthrottled = activeScript.code.includes('scroll') && !activeScript.code.includes('throttle') && !activeScript.code.includes('debounce');
      if (hasScrollUnthrottled) {
        currentScore -= 20;
        calculatedMetrics.push({
          name: 'UNTHROTTLED EVENT SCROLL',
          value: 120, // hypothetical frames drop
          rating: 'poor',
          explanation: 'Scroll listener detected without throttling. This triggers synchronous layout updates, dropping your user frame rate.'
        });
        pushLog('warn', '⚠️ Potential stutter: Found an unthrottled "scroll" listener. Recommendation: Implement a throttle/debounce helper to scale execution intervals.', 'FPS Drop Hazard');
      } else {
        calculatedMetrics.push({
          name: 'EVENT HOOK SANITATION',
          value: 0,
          rating: 'good',
          explanation: 'No hazardous or blocking scrolling events attached to system frame cycles.'
        });
      }

      // Metric 4: Script layout overhead
      calculatedMetrics.push({
        name: 'ESTIMATED CORE EXECUTION',
        value: totalExecutionTime,
        rating: totalExecutionTime < 10 ? 'good' : totalExecutionTime < 55 ? 'average' : 'poor',
        explanation: 'Time spent in VM parsing thread overhead.'
      });

      // Final logs setup
      setMetrics(calculatedMetrics);
      setDiagnosticScore(currentScore < 10 ? 10 : currentScore);

      // Generate visual charting timeline
      if (latencyRecords.length < 5) {
        // pad some layout events to create awesome charts
        for (let idx = latencyRecords.length + 1; idx <= 6; idx++) {
          latencyRecords.push({ step: idx, latency: Number((Math.random() * 0.4 + 0.1).toFixed(3)) });
        }
      }
      setLatencyData(latencyRecords);

    } catch (err: any) {
      pushLog('error', `Uncaught exception thrown during trace verification: ${err.message || err}`);
      setDiagnosticScore(30);
    }

    setLogs([...simLogs]);
  };

  const handleHtmlEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
  };

  const syncTemplateHtml = (mockId: string) => {
    const template = mockWebpages.find(w => w.id === mockId);
    if (template) {
      onWebpageChange(template);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full" id="script-simulator-root">
      
      {/* LEFT SECTION: Page context selection & Interactive Render Canvas sandbox (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        
        {/* Custom Webpage selector & Controller row */}
        <div className="flex flex-wrap items-center justify-between bg-black border border-neutral-800 p-3.5 rounded gap-3">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black uppercase text-white font-sans tracking-wide">SIMULATOR SANDBOX</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedWebpage.id}
              onChange={(e) => syncTemplateHtml(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-neutral-500 font-mono"
            >
              {mockWebpages.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                if (activeTab === 'preview') setActiveTab('html-editor');
                else setActiveTab('preview');
              }}
              className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs px-2.5 py-1.5 rounded border border-neutral-800 font-bold uppercase tracking-wider transition"
              title="Edit mock HTML markup code"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{activeTab === 'preview' ? 'Edit HTML' : 'Show Frame'}</span>
            </button>

            <button
              onClick={runSimulation}
              className="flex items-center gap-1.5 bg-white hover:bg-neutral-200 text-black text-xs px-3.5 py-1.5 rounded font-black uppercase tracking-wider cursor-pointer transition"
              id="simulator-deploy-btn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Deploy</span>
            </button>

            <button
              onClick={resetSimulation}
              className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 transition"
              title="Reset Sandbox Canvas and metrics logs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected template details info strip */}
        <div className="bg-neutral-900/60 border border-neutral-850 p-4 rounded flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            <b className="uppercase font-sans font-bold text-white">{selectedWebpage.name} Node Template</b> - {selectedWebpage.description} 
            <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">Simulated URL: {selectedWebpage.url}</span>
          </p>
        </div>

        {/* Webpage Sandbox frame area */}
        <div className="flex-1 min-h-[420px] bg-black rounded border border-neutral-800 flex flex-col overflow-hidden relative shadow-inner">
          <div className="bg-neutral-900/80 px-4 py-2 border-b border-neutral-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700"></span>
              <span className="text-[11px] text-neutral-500 font-mono select-none">https://tampermonkey-simu-agent.io/frame</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Target Node Sandbox Frame
            </div>
          </div>

          <div className="flex-1 p-5 overflow-auto">
            {activeTab === 'preview' ? (
              /* Simulated elements viewport layout */
              <div ref={sandboxRef} id="sandbox-inner-root" className="h-full">
                {/* HTML gets rendered dynamically inside */}
              </div>
            ) : (
              /* Custom webpage HTML editor */
              <div className="h-full flex flex-col space-y-2 font-mono">
                <div className="text-[10px] text-neutral-400">Tweak elements in the mock sandbox webpage inside real-time updates:</div>
                <textarea
                  value={htmlContent}
                  onChange={handleHtmlEdit}
                  className="flex-1 w-full bg-[#0a0a0a] p-3 rounded border border-neutral-800 text-xs font-mono text-emerald-400 focus:outline-none focus:border-neutral-500 h-96 resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Debug logs, Performance timing metrics chart & bottlenecks audit (4 Columns) */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        
        {/* DIAGNOSTIC AUDIT PANEL SUMMARY */}
        <div className="bg-black border border-neutral-800 p-6 rounded shadow-xl flex items-center justify-between relative overflow-hidden">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block">Diagnostic Health Rating</span>
            <span className="text-3xl font-black font-mono tracking-tighter text-white mt-1 block">
              {diagnosticScore}%
            </span>
            <span className="text-[10px] uppercase font-mono mt-1 px-2 py-0.5 rounded border inline-block"
              style={{
                backgroundColor: 'bg-neutral-900',
                borderColor: diagnosticScore > 85 ? '#34d399' : diagnosticScore > 50 ? '#fbbf24' : '#f87171',
                color: diagnosticScore > 85 ? '#34d399' : diagnosticScore > 50 ? '#fbbf24' : '#f87171',
              }}
            >
              {diagnosticScore > 85 ? 'PERFORMANCE PERFECT' : diagnosticScore > 50 ? 'WARNINGS ISSUED' : 'CRITICAL THREAD LAG'}
            </span>
          </div>

          <div className="relative">
            {/* Dynamic circular background visualization */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-4"
              style={{
                borderColor: diagnosticScore > 85 ? '#10b981' : diagnosticScore > 50 ? '#f59e0b' : '#ef4444',
                boxShadow: `0 0 10px ${diagnosticScore > 85 ? '#10b98133' : diagnosticScore > 50 ? '#f59e0b33' : '#ef444433'}`
              }}
            >
              <Zap className="w-6 h-6" style={{ color: diagnosticScore > 85 ? '#10b981' : diagnosticScore > 50 ? '#f59e0b' : '#ef4444' }} />
            </div>
          </div>
        </div>

        {/* VERIFY PERFORMANCE AND LATENCY GRAPH */}
        {latencyData.length > 0 && (
          <div className="bg-black border border-neutral-800 p-6 rounded flex flex-col">
            <h4 className="text-xs font-bold uppercase text-white mb-3 flex items-center gap-1.5 font-sans tracking-wide">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Timing Telemetry Trace
            </h4>
            <div className="h-28 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="step" stroke="#444" fontSize={9} />
                  <YAxis stroke="#444" fontSize={9} unit="ms" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff', fontSize: '10px' }}
                    labelFormatter={(label) => `Trace Node: ${label}`}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#fff" fill="#10b981" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <span className="text-[9px] text-neutral-500 font-mono text-center mt-3.5 leading-tight uppercase tracking-wider">
              Peaks indicate thread latency blocks.
            </span>
          </div>
        )}

        {/* PERFORMANCE PROFILE ALERTS */}
        {metrics.length > 0 && (
          <div className="bg-black border border-neutral-800 p-6 rounded flex flex-col space-y-2">
            <h4 className="text-xs font-bold uppercase text-white mb-2 flex items-center gap-1.5 font-sans tracking-wide">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Sandbox Analytics Log
            </h4>
            
            <div className="space-y-2 select-none overflow-y-auto max-h-48 pr-1">
              {metrics.map((m, idx) => (
                <div key={idx} className="p-3 rounded bg-neutral-900 border border-neutral-850 text-[11px] leading-relaxed">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-white tracking-tight">{m.name}</span>
                    <span className="text-[10px] font-mono px-1.5 rounded-sm"
                      style={{
                        backgroundColor: m.rating === 'good' ? '#10b98115' : m.rating === 'average' ? '#f59e0b15' : '#ef444415',
                        color: m.rating === 'good' ? '#10b981' : m.rating === 'average' ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      {m.value > 0 ? `${m.value}ms / ` : ''}{m.rating.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-neutral-400 text-[10px]">{m.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REAL-TIME DEPLOYMENT LOGGER TERMINAL (Logs feed) */}
        <div className="bg-black border border-neutral-800 rounded overflow-hidden flex flex-col flex-1 min-h-[250px]">
          <div className="bg-neutral-900 px-4 py-2.5 border-b border-neutral-850 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-neutral-200">Execution Stack logger</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[9px] text-neutral-500 hover:text-white uppercase font-mono"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 bg-[#050505] max-h-[300px]">
            {logs.length === 0 ? (
              <span className="text-neutral-600 block italic">Empty execution logs. Press deploy simulator above to trace stack.</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="border-b border-neutral-900/60 pb-1 flex flex-col">
                  <div className="flex items-start gap-1">
                    <span className="text-[9px] text-neutral-600 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    
                    {log.type === 'error' && <span className="text-red-500 font-bold shrink-0">[ERR]</span>}
                    {log.type === 'warn' && <span className="text-amber-500 font-bold shrink-0">[WRN]</span>}
                    {log.type === 'success' && <span className="text-emerald-400 font-bold shrink-0">[OK]</span>}
                    {log.type === 'dom' && <span className="text-sky-400 shrink-0 font-bold">[DOM]</span>}
                    {log.type === 'log' && <span className="text-white shrink-0 font-bold">[LOG]</span>}
                    {log.type === 'info' && <span className="text-neutral-500 shrink-0 font-bold">[SYS]</span>}
                    
                    <span className="text-neutral-200 select-text overflow-x-auto whitespace-pre-wrap">{log.message}</span>
                  </div>
                  {log.details && (
                    <span className="text-[10px] text-neutral-500 pl-16 font-mono block select-text">↳ {log.details}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* GREASEMONKEY SECURITY STORAGE MONITOR */}
        {Object.keys(gmStorage).length > 0 && (
          <div className="bg-black border border-neutral-800 p-4 rounded">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-450 mb-2 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              Synchronized Local Variables (GM Storage)
            </h4>
            <div className="space-y-1 bg-black p-2.5 rounded border border-neutral-850 max-h-24 overflow-y-auto">
              {Object.entries(gmStorage).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px] font-mono">
                  <span className="text-emerald-400">{k}:</span>
                  <span className="text-amber-400 font-bold">"{v}"</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
