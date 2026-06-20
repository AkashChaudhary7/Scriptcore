import React, { useState } from 'react';
import { Script } from '../types';
import { Sparkles, Send, ShieldAlert, CheckCircle, Flame, AlertCircle, RefreshCw, Copy, Code } from 'lucide-react';

interface AIAssistantProps {
  activeScript: Script;
  onCodeOptimized: (optimizedCode: string, explanation: string) => void;
  onCodeDebugged: (repairedCode: string, explanation: string) => void;
}

interface Message {
  type: 'user' | 'ai' | 'error';
  content: string;
  codeSnippet?: string;
  metrics?: any[];
  warnings?: string[];
  lastAction?: 'optimize' | 'debug' | 'explain';
}

export default function AIAssistant({
  activeScript,
  onCodeOptimized,
  onCodeDebugged,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content: `Hello! I am your **AI Script Optimization & Diagnostics Assistant**. 
Specify what you would like to do with **"${activeScript.name}"** or choose from the expert operations dashboard below.`,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerAIAction = async (action: 'optimize' | 'debug' | 'explain', userGoal?: string) => {
    setLoading(true);
    
    // Setup immediate user message
    let actionLogText = "";
    if (action === 'optimize') actionLogText = "Optimize UserScript execution latency and code structure.";
    else if (action === 'debug') actionLogText = `Fix script issue: "${userGoal || 'Debug default'}"`;
    else actionLogText = "Perform in-depth security and capability review of the active script.";

    setMessages(prev => [...prev, { type: 'user', content: actionLogText }]);

    try {
      const response = await fetch('/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          code: activeScript.code,
          name: activeScript.name,
          description: activeScript.description,
          userPrompt: userGoal
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to generate content from server api.');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: Message = {
        type: 'ai',
        content: data.explanation || 'Processing completed.',
        codeSnippet: data.optimizedCode || undefined,
        metrics: data.metrics || [],
        warnings: data.warnings || [],
        lastAction: action
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Error details: ${err.message || err}. Make sure you have configured your Google Gemini API Key in the AI Studio platform Secrets manager.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const goal = inputText;
    setInputText('');
    triggerAIAction('debug', goal);
  };

  const handleApplyAIChanges = (msg: Message) => {
    if (!msg.codeSnippet) return;
    if (msg.lastAction === 'optimize') {
      onCodeOptimized(msg.codeSnippet, msg.content);
    } else if (msg.lastAction === 'debug') {
      onCodeDebugged(msg.codeSnippet, msg.content);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded border border-neutral-800 overflow-hidden shadow-2xl" id="ai-assistant-root">
      
      {/* AI Header Panel */}
      <div className="bg-black border-b border-neutral-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-sans">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-xs font-black italic tracking-tighter uppercase text-white">AI DIAGNOSTICS DECK</h3>
        </div>
        <span className="text-[10px] bg-neutral-900 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider animate-pulse">
          Gemini 2.5 Active
        </span>
      </div>

      {/* AI Quick action board */}
      <div className="bg-black p-3 border-b border-neutral-850/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => triggerAIAction('optimize')}
          disabled={loading}
          className="text-left p-3.5 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
        >
          <div className="text-[11px] font-black uppercase text-white">⚡ Optimize Node</div>
          <div className="text-[10px] text-neutral-500 mt-1">Refactor query selectors and prevent layout reflow thrashing.</div>
        </button>

        <button
          onClick={() => triggerAIAction('explain')}
          disabled={loading}
          className="text-left p-3.5 rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer"
        >
          <div className="text-[11px] font-black uppercase text-emerald-400">🔍 Audit Security</div>
          <div className="text-[10px] text-neutral-500 mt-1 flex-1">Inspect script local permissions and third-party API hooks.</div>
        </button>

        <div className="p-3.5 rounded border border-neutral-800 bg-neutral-950/40 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-white uppercase font-mono tracking-wider">Direct Repair:</div>
          <p className="text-[9px] text-neutral-500 mt-0.5 leading-tight">Post custom error traces in the feed input box below to restore logic instantly.</p>
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[450px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col space-y-2 p-4 rounded border max-w-[90%] transition-all ${
              msg.type === 'user'
                ? 'bg-neutral-900 border-neutral-700 ml-auto text-neutral-200 text-xs shadow-sm font-mono'
                : msg.type === 'error'
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-200 text-xs'
                : 'bg-neutral-900/60 border-neutral-850 text-xs leading-relaxed text-neutral-300'
            }`}
          >
            {/* Header info */}
            <div className="flex items-center gap-1.5 justify-between">
              <span className={`text-[9px] font-bold uppercase tracking-wider font-mono ${msg.type === 'user' ? 'text-neutral-500' : 'text-emerald-400'}`}>
                {msg.type === 'user' ? 'Developer Console' : msg.type === 'error' ? 'Diagnostics Fault' : 'AI Assistant'}
              </span>
            </div>

            {/* Content markup renderer (supports nested inline highlights) */}
            <div className="whitespace-pre-wrap select-text selection:bg-neutral-700 leading-relaxed font-sans mt-1">
              {msg.content}
            </div>

            {/* Security Alerts and Warnings Box */}
            {msg.warnings && msg.warnings.length > 0 && (
              <div className="mt-2.5 p-3 rounded bg-yellow-500/10 border border-yellow-500/20 text-[11px] space-y-1">
                <div className="flex items-center gap-1 text-yellow-400 font-bold font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  CAPABILITY CRITICAL AUDIT WARNINGS:
                </div>
                <ul className="list-disc pl-4 text-neutral-400 text-[10px] space-y-0.5">
                  {msg.warnings.map((w, wIdx) => <li key={wIdx}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Optimized Code Snippet result card */}
            {msg.codeSnippet && (
              <div className="mt-3 border border-neutral-800 rounded overflow-hidden bg-black font-mono text-[11px] flex flex-col">
                <div className="bg-neutral-900 px-3 py-1.5 flex justify-between items-center border-b border-neutral-800">
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    Corrected UserScript Code Generated
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.codeSnippet || '')}
                      className="text-[9px] text-neutral-300 hover:text-white uppercase font-bold"
                    >
                      Copy
                    </button>
                    <b className="text-neutral-700">|</b>
                    <button
                      onClick={() => handleApplyAIChanges(msg)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase"
                    >
                      Apply To Editor
                    </button>
                  </div>
                </div>
                
                <pre className="p-3 overflow-x-auto max-h-56 leading-relaxed select-all">
                  <code>{msg.codeSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3.5 rounded bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 animate-pulse">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="font-mono text-[10px] uppercase">AI code analyzer executing deep heuristics check...</span>
          </div>
        )}
      </div>

      {/* Chat Form panel */}
      <form onSubmit={handleFreeformSubmit} className="p-3 border-t border-neutral-800 bg-black flex items-center gap-2" id="ai-chat-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Describe issue (e.g. coupon button clicks not matching)`}
          disabled={loading}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="p-2 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 rounded transition flex items-center justify-center cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
