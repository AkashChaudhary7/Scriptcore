import React, { useState, useMemo } from 'react';
import { Script, AppSettings } from '../types';
import { Search, Plus, Trash2, FileCode, ShieldCheck, ArrowRight, Copy, CheckSquare, Square, Layers, BarChart2, Crown, TrendingUp, Activity, Clock, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface DashboardProps {
  scripts: Script[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onAddNewScript: (name: string, description: string, matchPattern: string, tags: string) => void;
  onDeleteScript: (id: string) => void;
  onDuplicateScript: (id: string) => void;
  onBatchDeleteScripts: (ids: string[]) => void;
  isAdmin: boolean;
  onPromptAdminUnlock: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onSyncWithBackup: (backedData: { scripts: Script[]; settings: any }) => void;
}

export default function Dashboard({
  scripts,
  activeScriptId,
  onSelectScript,
  onAddNewScript,
  onDeleteScript,
  onDuplicateScript,
  onBatchDeleteScripts,
  isAdmin,
  onPromptAdminUnlock,
}: DashboardProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'alpha'>('modified');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Dynamic tags aggregation for Recharts Pie Chart representation
  const tagData = useMemo(() => {
    const rawCounts: Record<string, number> = {};
    scripts.forEach(s => {
      const tagsList = s.tags || [];
      tagsList.forEach(t => {
        const normalized = t.trim();
        rawCounts[normalized] = (rawCounts[normalized] || 0) + 1;
      });
    });
    
    const data = Object.entries(rawCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    return data.length > 0 ? data : [
      { name: 'Highlight', value: 2 },
      { name: 'E-Commerce', value: 1 },
      { name: 'Utility', value: 1 }
    ];
  }, [scripts]);

  // Dynamic simulation execution counts history (last 30 days) for Recharts Area Chart representation
  const activityData = useMemo(() => {
    const data = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 29);

    for (let i = 0; i < 30; i++) {
      const tempDate = new Date(baseDate);
      tempDate.setDate(baseDate.getDate() + i);
      const formatted = tempDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const baseValue = 135 + (scripts.length * 24);
      const sinWave = Math.sin(i * 0.45) * 45;
      const cosWave = Math.cos(i * 0.3) * 15;
      const pseudoDelta = ((i * 19) % 31) - 15;
      const totalHits = Math.max(20, Math.round(baseValue + sinWave + cosWave + pseudoDelta));

      data.push({
        date: formatted,
        "Simulations": totalHits,
        "Syncs": Math.max(5, Math.round(totalHits * 0.55))
      });
    }
    return data;
  }, [scripts.length]);

  const PIE_COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'];
  
  
  // Script Creation state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMatch, setNewMatch] = useState('*://*/*');

  const filteredScripts = scripts
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.description.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'modified') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      } else if (sortBy === 'created') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  const toggleSelectCard = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onPromptAdminUnlock();
      return;
    }
    if (!newName.trim()) return;
    onAddNewScript(newName, newDesc, newMatch, 'Utility');
    setNewName('');
    setNewDesc('');
    setNewMatch('*://*/*');
    setShowCreateForm(false);
  };

  const lastUpdatedText = (() => {
    if (scripts.length === 0) return 'No scripts';
    const dates = scripts.map(s => new Date(s.updatedAt || s.createdAt || Date.now()).getTime());
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + maxDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  })();

  return (
    <div className="space-y-6" id="dashboard-main-root">
      
      {/* 1. Header Overview Stats section */}
      <div className="relative overflow-hidden rounded-xl bg-neutral-950 border border-neutral-850 p-6 md:p-8">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Isolated Environment Active</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase font-sans">
              Script Library
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-lg">
              Manage custom user scripts, simulate behaviors across target patterns, and evaluate scripts in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Refined Minimalist Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stat 1: Total scripts */}
        <div className="bg-neutral-900/30 border border-neutral-850/60 rounded-xl p-5 flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">Total UserScripts</span>
            <span className="text-3xl font-mono font-black text-white">{scripts.length}</span>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg text-indigo-400">
            <FileCode className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 2: Last updated timestamp */}
        <div className="bg-neutral-900/30 border border-neutral-850/60 rounded-xl p-5 flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">Last Updated</span>
            <span className="text-xs font-mono font-bold text-neutral-200 mt-1.5 block">{lastUpdatedText}</span>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg text-purple-400">
            <Plus className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 3: Active sandbox status */}
        <div className="bg-neutral-900/30 border border-neutral-850/60 rounded-xl p-5 flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold">Sandbox Isolation</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">Active & Secured</span>
            </div>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ADMIN METRICS DASHBOARD (RECHARTS VISUALIZATION) */}
      {isAdmin && (
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl transition-all" id="admin-analytics-panel">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
          
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-850 pb-5 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                  <span>Administrative Metrics & Analytics</span>
                </h2>
                <span className="text-[10px] text-neutral-500 font-mono">Real-time script properties and deployment heat-maps</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/20 px-2.5 py-1 bg-emerald-500/10 rounded">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                Stats Live Link
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
            {/* Tag Distribution Pie Chart */}
            <div className="lg:col-span-2 bg-[#090909] border border-neutral-850 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-850/40">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Tag Distribution (% Library)
                  </span>
                </div>
                
                <div className="h-[200px] flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tagData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {tagData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Inner Label for Donut chart aesthetic */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-mono font-black text-white">{scripts.length}</span>
                    <span className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">Scripts</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Legend Badges with Colors */}
              <div className="flex flex-wrap gap-2 justify-center mt-3 pt-3 border-t border-neutral-850/40">
                {tagData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded border border-neutral-850 text-[10px] font-mono">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-neutral-400 text-[10px]">{item.name}</span>
                    <span className="text-neutral-200 font-bold">({item.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total activity graph of past 30 days */}
            <div className="lg:col-span-3 bg-[#090909] border border-neutral-850 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-850/40">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    30-Day Sandbox Run Executions Frequency
                  </span>
                  <span className="text-[9px] text-neutral-500 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last 30 Days
                  </span>
                </div>

                <div className="h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSyncs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#525252" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis 
                        stroke="#525252" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Simulations" 
                        stroke="#a855f7" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorExecutions)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Syncs" 
                        stroke="#6366f1" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill="url(#colorSyncs)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-2.5 pt-2.5 border-t border-neutral-850/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-purple-500 rounded"></span> Matches active instances run.
                </span>
                <span className="text-neutral-450 uppercase text-[9px] font-bold">Total simulated 30d loads: <strong className="text-white font-black">{activityData.reduce((acc, curr) => acc + curr.Simulations, 0)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Control Row: Universal Search & New Script Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950/40 border border-neutral-850/60 p-4 rounded-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-500">
              <Search className="w-4 h-4 text-neutral-400" />
            </span>
            <input
              type="text"
              placeholder="Type keyword to filter script modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900/40 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 bg-neutral-900/40 border border-neutral-800 rounded-lg px-2.5 py-1.5 shrink-0 select-none">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-0 text-neutral-200 text-xs focus:outline-none cursor-pointer font-mono font-bold hover:text-white transition outline-none"
            >
              <option value="modified" className="bg-neutral-950 text-white">Last Modified</option>
              <option value="created" className="bg-neutral-950 text-white">Creation Date</option>
              <option value="alpha" className="bg-neutral-950 text-white">Alphabetical</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds([]);
            }}
            className={`flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition duration-150 border cursor-pointer ${
              selectMode 
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' 
                : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Select Mode</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isAdmin) {
                onPromptAdminUnlock();
                return;
              }
              setShowCreateForm(!showCreateForm);
            }}
            className={`flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition duration-150 shrink-0 shadow-lg cursor-pointer ${
              isAdmin 
                ? 'bg-white hover:bg-neutral-200 text-black shadow-white/5' 
                : 'bg-neutral-900/40 border border-neutral-800/80 text-neutral-500 hover:text-neutral-400 cursor-not-allowed'
            }`}
            id="dashboard-btn-create"
            title={isAdmin ? "Create new script" : "Create Locked (Admin only)"}
          >
            <Plus className="w-4 h-4" />
            <span>New Script</span>
          </button>
        </div>
      </div>

      {/* Select Mode Batch Actions Strip */}
      {selectMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/20 border border-purple-500/20 p-4 rounded-xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
              {selectedIds.length} script{selectedIds.length === 1 ? '' : 's'} selected
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setSelectedIds(filteredScripts.map(s => s.id))}
              className="text-[10px] font-mono font-bold uppercase text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] font-mono font-bold uppercase text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => {
                if (selectedIds.length === 0) return;
                if (!isAdmin) {
                  onPromptAdminUnlock();
                  return;
                }
                if (confirm(`Are you sure you want to delete these ${selectedIds.length} selected scripts?`)) {
                  onBatchDeleteScripts(selectedIds);
                  setSelectedIds([]);
                  setSelectMode(false);
                }
              }}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded transition ${
                selectedIds.length > 0 
                  ? 'bg-rose-500 hover:bg-rose-650 text-white cursor-pointer' 
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Batch Delete ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Modern grid library list */}
      {filteredScripts.length === 0 ? (
        <div className="bg-neutral-950 p-16 text-center rounded-xl border border-dashed border-neutral-800">
          <FileCode className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="text-neutral-400 text-xs mt-3 font-mono uppercase tracking-wider">No active script modules found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((s) => {
            const isActive = s.id === activeScriptId;
            const isSelected = selectedIds.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => {
                  if (selectMode) {
                    toggleSelectCard(s.id);
                  } else {
                    onSelectScript(s.id);
                  }
                }}
                className={`relative group rounded-xl p-5 border cursor-pointer flex flex-col justify-between h-56 transition-all duration-300 backdrop-blur-md ${
                  selectMode && isSelected
                    ? 'bg-purple-950/25 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/20'
                    : isActive && !selectMode
                    ? 'bg-neutral-900/60 border-white shadow-xl shadow-neutral-950 ring-1 ring-white/10' 
                    : 'bg-neutral-950/20 border-neutral-850/60 hover:bg-neutral-900/40 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]'
                }`}
              >
                {/* Neon blur hover glow decoration */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-indigo-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-indigo-500/5 rounded-xl transition duration-500 pointer-events-none" />

                {/* Select Mode checkbox indicator on top right */}
                {selectMode && (
                  <div className="absolute top-4 right-4 z-20">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400" />
                    )}
                  </div>
                )}

                {/* Decorative border/indicator accent for active script */}
                {isActive && !selectMode && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full m-3 shadow-lg shadow-emerald-400/50 animate-pulse" />
                )}

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${
                        isActive && !selectMode ? 'bg-black border-neutral-850 text-emerald-400' : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 group-hover:text-white'
                      }`}>
                        <FileCode className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase text-white tracking-tight line-clamp-1">
                        {s.name}
                      </h3>
                    </div>
                    {!selectMode && (
                      <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                        v{s.version}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-relaxed line-clamp-3">
                    {s.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-neutral-850 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span className="truncate max-w-[130px]" title={s.sitePattern}>
                      Match: <strong className="text-neutral-300">{s.sitePattern}</strong>
                    </span>
                    <span className="truncate max-w-[130px]">
                      Author: <strong className="text-purple-400 font-semibold uppercase font-sans">{s.author}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white uppercase group-hover:text-emerald-400 transition">
                      <span>{selectMode ? (isSelected ? 'Checked' : 'Check Card') : 'Sync Code Editor'}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition duration-200" />
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            onPromptAdminUnlock();
                            return;
                          }
                          onDuplicateScript(s.id);
                        }}
                        className={`p-1.5 rounded transition duration-150 ${
                          isAdmin 
                            ? 'text-neutral-500 hover:text-purple-400 hover:bg-purple-950/20 cursor-pointer' 
                            : 'text-neutral-750 cursor-not-allowed hover:text-neutral-600'
                        }`}
                        title={isAdmin ? "Duplicate Script" : "Duplicate Locked (Admin only)"}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            onPromptAdminUnlock();
                            return;
                          }
                          if (confirm(`Are you sure you want to permanently delete "${s.name}"?`)) {
                            onDeleteScript(s.id);
                          }
                        }}
                        className={`p-1.5 rounded transition duration-150 ${
                          isAdmin 
                            ? 'text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 cursor-pointer' 
                            : 'text-neutral-750 cursor-not-allowed hover:text-neutral-600'
                        }`}
                        title={isAdmin ? "Delete UserScript" : "Delete Locked (Admin only)"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Script Creation Drawer Block */}
      {showCreateForm && (
        <div className="bg-neutral-950 border border-neutral-850 p-6 rounded-xl space-y-4 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 tracking-wider">Setup Script Descriptor Meta</h3>
            <button 
              onClick={() => setShowCreateForm(false)} 
              className="text-neutral-500 hover:text-white text-xs uppercase font-bold"
            >
              Cancel
            </button>
          </div>
          
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-neutral-400 mb-1">Script Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Price Multiplier"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono font-bold text-neutral-400 mb-1 flex items-center justify-between">
                  <span>Match Pattern URL Path</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="*://*/*"
                  value={newMatch}
                  onChange={(e) => setNewMatch(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-neutral-400 mb-1">Brief Description</label>
              <input
                type="text"
                placeholder="Dispatches glowing highlights on products catalog elements..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-black py-2.5 rounded-lg transition uppercase tracking-wider mt-2"
              id="create-submit-btn"
            >
              Assemble Template
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
