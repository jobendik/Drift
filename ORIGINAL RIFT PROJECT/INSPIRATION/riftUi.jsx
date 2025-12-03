import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  ShoppingCart,
  BookOpen as Book,
  User,
  Home,
  Zap,
  Activity,
  Crosshair,
  Shield,
  TrendingUp,
  Flame,
  Menu,
  X,
  Search,
  Target,
  Award,
  Clock,
  ChevronRight,
  Hexagon,
  Monitor,
  Volume2,
  Mic,
  Gamepad2,
  Skull,
  Flag,
  Play,
  RotateCcw,
  Eye,
  Lock
} from 'lucide-react';

/***********************************
 * MOCK DATA & CONSTANTS
 ***********************************/

const CURRENT_USER = {
  id: 1,
  username: 'CYPHER_GHOST',
  tag: '#9901',
  level: 47,
  xp: 8250,
  xpToNext: 10000,
  prestige: 2,
  rank: 'Cyber Elite',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CYPHER_GHOST&backgroundColor=b6e3f4',
  bio: 'Velocity demon. Top 50 global. Neon assassin main.',
  currency: {
    riftTokens: 4520,
    plasmaCredits: 800,
  },
  stats: {
    kdr: 2.84,
    accuracy: 68,
    headshots: 42,
    wins: 342,
    matches: 578,
    killStreak: 23,
    velocity: 48.3,
    headshotPct: '32%',
    winRate: '61%',
    movementScore: 890,
    maxVelocity: '48.3 m/s',
    playTime: '142h',
    slideKills: 1247,
    airKills: 892,
  },
  badges: [
    { icon: '⚡', name: 'Velocity Demon', rarity: 'legendary' },
    { icon: '🎯', name: 'Headshot Master', rarity: 'epic' },
    { icon: '🔥', name: 'Killstreak King', rarity: 'rare' },
  ],
};

// Merged Data: 34 Game Modes organized by Category
const GAME_MODES = {
  'Arena': [
    { id: 'arena-classic', name: 'Classic Arena', description: 'Endless waves survival', icon: Zap },
    { id: 'arena-time', name: 'Time Attack', description: 'Max kills in 3 minutes', icon: Clock },
    { id: 'arena-rotating', name: 'Rotating Zones', description: 'Capture moving zones', icon: Target },
    { id: 'arena-chaos', name: 'Chaos Mode', description: 'Random mutators active', icon: Flame },
    { id: 'arena-gauntlet', name: 'Daily Gauntlet', description: 'Seeded daily run', icon: Trophy },
    { id: 'arena-weapon', name: 'Weapon Rotation', description: 'Auto-switching weapons', icon: RotateCcw },
    { id: 'arena-combo', name: 'Combo Trials', description: 'Keep combo or die', icon: Activity },
    { id: 'arena-precision', name: 'Precision Arena', description: 'Headshots only count', icon: Crosshair },
  ],
  'Core': [
    { id: 'arena-waves', name: 'Arena Survival', description: 'Endless waves of enemies', icon: Shield },
    { id: 'duel', name: '1v1 Duel', description: 'Competitive solo combat', icon: Crosshair },
    { id: 'br', name: 'Battle Royale', description: 'Last survivor standing', icon: Skull },
    { id: 'tdm', name: 'Team Deathmatch', description: 'Team vs Team warfare', icon: Users },
    { id: 'ctf', name: 'Capture The Flag', description: 'Objective based tactical play', icon: Flag },
    { id: 'horde', name: 'Co-op Horde', description: 'Team survival against AI', icon: Users },
  ],
  'Classic': [
    { id: 'ffa', name: 'Free For All', description: 'Everyone vs everyone', icon: Zap },
    { id: 'koth', name: 'King of the Hill', description: 'Control the zone', icon: Target },
    { id: 'elimination', name: 'Elimination', description: 'No respawns, last team wins', icon: Skull },
    { id: 'domination', name: 'Domination', description: 'Capture multiple points', icon: Flag },
    { id: 'hardpoint', name: 'Hardpoint', description: 'Rotating control zones', icon: Target },
  ],
  'Progression': [
    { id: 'gun-game', name: 'Gun Game', description: 'Progress through weapons', icon: Hexagon },
    { id: 'infection', name: 'Infection', description: 'Survivors vs infected', icon: Skull },
    { id: 'juggernaut', name: 'Juggernaut', description: 'One super powerful player', icon: Shield },
    { id: 'assassin', name: 'Assassin', description: 'Protect VIP, kill enemy VIP', icon: Crosshair },
  ],
  'Objective': [
    { id: 'payload', name: 'Payload', description: 'Escort objective to goal', icon: Flag },
    { id: 'extraction', name: 'Extraction', description: 'Get loot and extract', icon: Trophy },
    { id: 'demolition', name: 'Demolition', description: 'Plant/defuse objectives', icon: Flame },
    { id: 'heist', name: 'Heist', description: 'Steal and escape', icon: Lock },
  ],
  'Special': [
    { id: 'one-chamber', name: 'One in Chamber', description: 'One bullet, one life', icon: Target },
    { id: 'instagib', name: 'Instagib', description: 'One shot, one kill', icon: Zap },
    { id: 'dodgeball', name: 'Dodgeball', description: 'Deflect projectiles back', icon: Activity },
    { id: 'boss-rush', name: 'Boss Rush', description: 'Co-op vs Mega Bosses', icon: Skull },
  ],
  'Training': [
    { id: 'target', name: 'Target Practice', description: 'Aim training', icon: Target },
    { id: 'time-trial', name: 'Time Trial', description: 'Speed through course', icon: Clock },
    { id: 'score-attack', name: 'Score Attack', description: 'Max score in time limit', icon: Trophy },
  ]
};

const BESTIARY_DATA = [
  { name: "GRUNT", desc: "Light Infantry // Wireframe", color: "#00FFFF", danger: 1 },
  { name: "SHOOTER", desc: "Ranged Unit // Watcher", color: "#9D00FF", danger: 2 },
  { name: "HEAVY", desc: "Tank Unit // The Stack", color: "#FF0000", danger: 3 },
  { name: "SPLICER", desc: "Glitch Unit // Fragmented", color: "#FFFF00", danger: 2 },
  { name: "SWARMER", desc: "Horde Unit // Simple", color: "#FF5500", danger: 1 },
  { name: "ARTILLERY", desc: "Siege Unit // Core Shell", color: "#FFFFFF", danger: 3 },
  { name: "VIPER", desc: "Sniper // Satellite", color: "#00FF88", danger: 4 },
  { name: "BULWARK", desc: "Shielded // The Halo", color: "#0066FF", danger: 3 },
  { name: "TITAN", desc: "Elite Heavy // The Void", color: "#FF0044", danger: 5 },
  { name: "THE SERAPH", desc: "Aerial Boss // Winged", color: "#FFCC00", isBoss: true, danger: 10 },
  { name: "THE HIVE", desc: "Carrier Boss // Swarm Host", color: "#00FF22", isBoss: true, danger: 10 },
  { name: "THE OMEGA", desc: "FINAL BOSS // Godform", color: "#FFFFFF", isBoss: true, danger: 10 }
];

const LEADERBOARD_DATA = [
  { rank: 1, name: 'PHANTOM_X', kills: 15234, kdr: 3.42, avatar: '👑', clan: '[NVDA]' },
  { rank: 2, name: 'NEON_REAPER', kills: 14892, kdr: 3.28, avatar: '💀', clan: '[HACK]' },
  { rank: 3, name: 'VOID_STRIKER', kills: 14203, kdr: 3.15, avatar: '⚔️', clan: '[BUG]' },
  { rank: 4, name: 'CYPHER_GHOST', kills: 13847, kdr: 2.84, avatar: '🎯', clan: '[RIFT]' },
  { rank: 5, name: 'PLASMA_HUNTER', kills: 13402, kdr: 2.91, avatar: '🔫', clan: '[FAST]' },
];

const MARKET_ITEMS = [
  { id: 1, name: 'Void Walker', type: 'Skin', rarity: 'Legendary', price: 2500, currency: 'plasma', image: 'text-purple-400' },
  { id: 2, name: 'Cyber Katana', type: 'Melee', rarity: 'Epic', price: 1200, currency: 'tokens', image: 'text-cyan-400' },
  { id: 3, name: 'Neon Trail', type: 'Effect', rarity: 'Rare', price: 800, currency: 'tokens', image: 'text-orange-400' },
  { id: 4, name: 'Glitch Protocol', type: 'Finisher', rarity: 'Legendary', price: 3000, currency: 'plasma', image: 'text-purple-400' },
];

const WEAPONS_DATA = [
  { name: 'Plasma Rifle', damage: 35, rpm: 720, range: 'Medium', type: 'Assault' },
  { name: 'Neon Shotgun', damage: 120, rpm: 90, range: 'Close', type: 'Power' },
  { name: 'Void Sniper', damage: 180, rpm: 45, range: 'Long', type: 'Precision' },
  { name: 'Arc SMG', damage: 22, rpm: 1200, range: 'Close', type: 'Speed' },
];

const MATCH_HISTORY = [
  { map: 'Neon District', mode: 'Deathmatch', k: 32, d: 11, result: 'WIN', ago: '2m ago' },
  { map: 'Cyber Plaza', mode: 'Team Clash', k: 28, d: 15, result: 'WIN', ago: '15m ago' },
  { map: 'Velocity Zone', mode: 'Capture', k: 19, d: 18, result: 'LOSS', ago: '1h ago' },
  { map: 'Neon District', mode: 'Deathmatch', k: 41, d: 9, result: 'WIN', ago: '3h ago' },
];

const LOADOUTS = [
  { id: 1, name: 'Velocity Assault', role: 'Aggressive Entry', primary: 'Plasma Rifle', secondary: 'Arc SMG', sidearm: 'Neon Pistol', gadget: 'Motion Sensor', passive: 'Slide Booster' },
  { id: 2, name: 'Hyper SMG', role: 'Close-Quarters Control', primary: 'Arc SMG', secondary: 'Neon Shotgun', sidearm: 'Burst Pistol', gadget: 'Flash Charge', passive: 'Air Strafe' },
  { id: 3, name: 'Phantom Sniper', role: 'Long-Range Pick', primary: 'Void Sniper', secondary: 'Plasma Rifle', sidearm: 'Silenced Pistol', gadget: 'Holo Decoy', passive: 'Low Profile' },
];

/***********************************
 * SHARED UI PRIMITIVES
 ***********************************/

const GlitchText = ({ text, className = '' }) => (
  <span className={`relative inline-block font-black tracking-[0.25em] ${className} glitch-text`} data-text={text}>
    {text}
  </span>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-8 border-l-4 border-cyan-400 pl-4 py-1 bg-gradient-to-r from-cyan-900/20 to-transparent">
    <h2 className="text-3xl font-bold text-white uppercase tracking-widest">{title}</h2>
    {subtitle && <p className="text-slate-400 text-sm mt-1 font-mono">{subtitle}</p>}
  </div>
);

const Card = ({ children, className = '', glow = 'purple', onClick }) => {
  const glowColors = {
    purple: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:border-purple-500/60',
    cyan: 'hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:border-cyan-400/60',
    orange: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.35)] hover:border-orange-500/60',
    red: 'hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:border-red-500/60',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[#0A0A0A]/95 border border-slate-800 p-6 relative overflow-hidden transition-all duration-300 group rounded-sm ${glowColors[glow]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="absolute top-0 right-0 w-8 h-8 bg-slate-900 rotate-45 transform translate-x-4 -translate-y-4 border-l border-b border-slate-800 group-hover:border-white/20 transition-colors" />
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_60%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

const StatBox = ({ label, value, icon: Icon, color = 'text-cyan-400' }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-slate-800/60 rounded-sm hover:bg-slate-900/60 transition-colors">
    <div className="flex items-center space-x-2 mb-1">
      {Icon && <Icon size={14} className="text-slate-500" />}
      <span className="text-xs text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
  </div>
);

/***********************************
 * VIEW COMPONENTS
 ***********************************/

const HomeView = ({ currentUser }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="relative h-64 rounded-sm overflow-hidden border border-slate-800 group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-slate-900 to-black opacity-60 group-hover:opacity-70 transition-all duration-500" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
      
      <div className="absolute bottom-0 left-0 p-8 w-full max-w-2xl">
        <div className="flex items-center space-x-2 mb-2">
          <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500 text-orange-400 text-xs font-bold uppercase tracking-wider">Season 4 Live</span>
          <span className="text-slate-400 text-xs">|</span>
          <span className="text-cyan-400 text-xs font-mono">PATCH 4.2.0</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 italic tracking-tighter">NEON HORIZON</h1>
        <p className="text-slate-300 mb-6 max-w-lg">New map "Core Reactor" added to ranked rotation. Double XP weekend starts now.</p>
        <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 uppercase tracking-wider skew-x-[-10deg] transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]">
          <span className="block skew-x-[10deg]">Play Ranked</span>
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card glow="purple" className="col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Recent Performance</h3>
          <span className="text-xs text-slate-500 font-mono">LAST 4 MATCHES</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="K/D Ratio" value={currentUser.stats.kdr} icon={Crosshair} color="text-red-400" />
          <StatBox label="Win Rate" value={currentUser.stats.winRate} icon={Trophy} color="text-yellow-400" />
          <StatBox label="Accuracy" value={`${currentUser.stats.accuracy}%`} icon={Crosshair} />
          <StatBox label="Play Time" value={currentUser.stats.playTime} icon={Clock} color="text-slate-300" />
        </div>
      </Card>

      <Card glow="orange">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg flex items-center gap-2"><Flame size={18} className="text-orange-500" /> Daily Challenge</h3>
          <span className="text-xs text-orange-500 font-bold border border-orange-500/30 px-2 rounded-full">ACTIVE</span>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Headshot Kills</span>
              <span className="text-orange-400 font-mono">34 / 50</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-[68%] shadow-[0_0_10px_orange]" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Reward: <span className="text-cyan-400">Neon Blade Badge</span> + 1000 XP</p>
        </div>
      </Card>
    </div>
  </div>
);

const PlayView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <SectionHeader title="Game Modes" subtitle="Select your simulation environment" />
    
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Filters:</span>
      {Object.keys(GAME_MODES).map(cat => (
         <button key={cat} className="px-3 py-1 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 uppercase tracking-widest transition-all hover:text-cyan-400 whitespace-nowrap">
            {cat}
         </button>
      ))}
    </div>

    {Object.entries(GAME_MODES).map(([category, modes]) => (
      <div key={category} className="mb-8">
        <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
          <Hexagon size={16} /> {category} Playlist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Card key={mode.id} glow="cyan" className="group cursor-pointer hover:bg-slate-900/80">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="mb-4 p-3 bg-slate-900 w-fit rounded-lg border border-slate-800 group-hover:border-cyan-500/50 transition-colors">
                      <Icon size={24} className="text-cyan-400" />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-1">{mode.name}</h4>
                    <p className="text-slate-500 text-xs mb-4">{mode.description}</p>
                  </div>
                  <button className="w-full py-2 bg-slate-800 group-hover:bg-cyan-500 group-hover:text-black text-slate-300 text-xs font-bold uppercase tracking-widest transition-all">
                    Initialize
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    ))}

    <Card glow="purple" className="mt-8 border-t-4 border-t-purple-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-white font-bold text-xl mb-1 flex items-center gap-2">
            <Users className="text-purple-400" /> Custom Lobby
          </h3>
          <p className="text-slate-400 text-sm">Create a private instance with custom rulesets and mutators.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-8 py-3 bg-transparent border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white font-bold uppercase text-xs tracking-widest transition-all">
            Join Code
          </button>
          <button className="flex-1 md:flex-none px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase text-xs tracking-widest transition-all">
            Create Match
          </button>
        </div>
      </div>
    </Card>
  </div>
);

const LoadoutsView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <SectionHeader title="Loadouts" subtitle="Edit and select your competitive setups" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {LOADOUTS.map((loadout) => (
        <Card key={loadout.id} glow="cyan" className="flex flex-col justify-between">
          <div>
            <h3 className="text-white text-lg mb-1 font-bold">{loadout.name}</h3>
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">{loadout.role}</p>
            <div className="text-xs text-slate-300 space-y-2 mt-4">
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Primary</span> <span className="text-cyan-400">{loadout.primary}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Secondary</span> <span className="text-purple-400">{loadout.secondary}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Sidearm</span> <span>{loadout.sidearm}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1">
                <span className="text-slate-500">Gadget</span> <span>{loadout.gadget}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <button className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold uppercase tracking-widest">Equip</button>
            <button className="flex-1 py-2 bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400 text-xs uppercase tracking-widest">Edit</button>
          </div>
        </Card>
      ))}
      <div className="border border-dashed border-slate-800 rounded-sm flex flex-col items-center justify-center p-8 text-slate-600 hover:text-slate-400 hover:border-slate-600 cursor-pointer transition-all">
        <div className="text-4xl mb-2">+</div>
        <div className="text-xs uppercase tracking-widest">New Loadout</div>
      </div>
    </div>
  </div>
);

const ProfileView = ({ currentUser }) => (
  <div className="animate-in slide-in-from-bottom-4 duration-500">
    <div className="relative mb-8">
      <div className="h-48 w-full bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:40px_40px]" />
      </div>
      <div className="max-w-6xl mx-auto px-6 relative -mt-16 flex flex-col md:flex-row items-end md:items-center gap-6">
        <div className="relative">
          <div className="w-32 h-32 bg-black border-2 border-cyan-400 p-1 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
            <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full bg-slate-800 rounded-full" />
          </div>
          <div className="absolute -bottom-3 -right-3 bg-black border border-purple-500 text-purple-400 text-xs px-2 py-1 font-bold">LVL {currentUser.level}</div>
        </div>
        <div className="flex-1 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl text-white font-bold tracking-tight">{currentUser.username}</h1>
            <span className="text-slate-500 text-xl font-mono">{currentUser.tag}</span>
          </div>
          <p className="text-cyan-400 text-sm uppercase tracking-widest mb-4">Rank: {currentUser.rank}</p>
          <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-cyan-500" style={{ width: `${(currentUser.xp / currentUser.xpToNext) * 100}%` }} />
          </div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between max-w-md">
            <span>XP: {currentUser.xp} / {currentUser.xpToNext}</span>
            <span>Next: Level {currentUser.level + 1}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatBox label="K/D Ratio" value={currentUser.stats.kdr} icon={Crosshair} color="text-red-400" />
      <StatBox label="Win Rate" value={currentUser.stats.winRate} icon={Trophy} color="text-yellow-400" />
      <StatBox label="Accuracy" value={`${currentUser.stats.accuracy}%`} icon={Crosshair} />
      <StatBox label="Slide Kills" value={currentUser.stats.slideKills} icon={TrendingUp} color="text-orange-400" />
    </div>

    <SectionHeader title="Match History" />
    <div className="space-y-2">
      {MATCH_HISTORY.map((match, idx) => (
        <div key={idx} className="flex flex-col md:flex-row items-center justify-between bg-[#0A0A0A] border-l-4 border-slate-800 p-4 hover:bg-white/5 transition-colors relative">
          <div className={`w-1 h-full absolute left-0 top-0 ${match.result === 'WIN' ? 'bg-cyan-500' : 'bg-red-500'}`} />
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className={`text-sm font-bold px-3 py-1 uppercase tracking-wider ${match.result === 'WIN' ? 'text-cyan-400 bg-cyan-900/20' : 'text-red-400 bg-red-900/20'}`}>
              {match.result}
            </div>
            <div>
              <div className="text-white font-bold">{match.map}</div>
              <div className="text-xs text-slate-500 uppercase">{match.mode}</div>
            </div>
          </div>
          <div className="flex items-center gap-8 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
            <div className="text-center">
              <div className="text-xs text-slate-500 uppercase">K / D</div>
              <div className="text-slate-200 font-mono">{match.k} / {match.d}</div>
            </div>
            <div className="text-slate-600 text-xs font-mono">{match.ago}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LeaderboardView = () => (
  <div className="animate-in slide-in-from-bottom-4 duration-500">
    <SectionHeader title="Leaderboards" subtitle="Compete for global dominance" />
    <div className="bg-[#0A0A0A] border border-slate-800 rounded-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-black/80 border-b border-slate-800 text-slate-500 text-xs uppercase tracking-widest font-mono">
            <th className="p-4">Rank</th>
            <th className="p-4">Player</th>
            <th className="p-4">Clan</th>
            <th className="p-4 text-right">Kills</th>
            <th className="p-4 text-right">KDR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {LEADERBOARD_DATA.map((player) => (
            <tr key={player.rank} className="hover:bg-white/5 transition-colors group">
              <td className="p-4 font-bold">{player.rank <= 3 ? <span className="text-xl">{['🥇', '🥈', '🥉'][player.rank - 1]}</span> : <span className="text-slate-600">#{player.rank}</span>}</td>
              <td className="p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{player.avatar}</span>
                  <span className="text-slate-200 font-bold group-hover:text-cyan-400 transition-colors">{player.name}</span>
                </div>
              </td>
              <td className="p-4 text-slate-400 font-mono text-sm">{player.clan}</td>
              <td className="p-4 text-right text-cyan-400 font-mono">{player.kills.toLocaleString()}</td>
              <td className="p-4 text-right text-purple-400 font-bold">{player.kdr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MarketView = () => (
  <div className="animate-in slide-in-from-bottom-4 duration-500">
    <SectionHeader title="Black Market" subtitle="Skins, effects and weapon mods" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {MARKET_ITEMS.map((item) => (
        <Card key={item.id} className="group cursor-pointer" glow={item.currency === 'plasma' ? 'purple' : 'cyan'}>
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-slate-800 text-[10px] uppercase text-slate-400">{item.type}</div>
          <div className={`h-40 flex items-center justify-center bg-gradient-to-b from-transparent to-slate-900/50 mb-4 ${item.image}`}>
            <Hexagon size={64} className="drop-shadow-[0_0_15px_currentColor] animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase tracking-wide group-hover:text-cyan-400 transition-colors">{item.name}</h3>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 border ${item.rarity === 'Legendary' ? 'border-yellow-600 text-yellow-500' : item.rarity === 'Epic' ? 'border-purple-600 text-purple-500' : 'border-blue-600 text-blue-500'}`}>{item.rarity}</span>
              <div className="flex items-center gap-1">
                <span className={`font-mono font-bold ${item.currency === 'plasma' ? 'text-purple-400' : 'text-cyan-400'}`}>{item.price}</span>
                {item.currency === 'plasma' ? <Zap size={14} className="text-purple-500" /> : <Hexagon size={14} className="text-cyan-500" />}
              </div>
            </div>
          </div>
          <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white py-2 text-xs uppercase tracking-widest transition-colors border-t border-slate-700">Inspect</button>
        </Card>
      ))}
    </div>
  </div>
);

const WikiView = () => {
  const [activeTab, setActiveTab] = useState('weapons');

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title="Wiki & Database" subtitle="Master the meta" />
      
      <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-2">
        <button 
          onClick={() => setActiveTab('weapons')}
          className={`pb-2 px-2 text-sm uppercase tracking-wider font-bold transition-all ${activeTab === 'weapons' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Weapons
        </button>
        <button 
          onClick={() => setActiveTab('bestiary')}
          className={`pb-2 px-2 text-sm uppercase tracking-wider font-bold transition-all ${activeTab === 'bestiary' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Bestiary (Enemies)
        </button>
      </div>

      {activeTab === 'weapons' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="space-y-4">
              {WEAPONS_DATA.map((weapon) => (
                <div key={weapon.name} className="bg-slate-900/50 p-4 border border-slate-800 flex flex-col gap-3 hover:border-cyan-500/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-cyan-400 font-bold group-hover:text-cyan-300">{weapon.name}</h4>
                      <span className="text-xs text-slate-500 uppercase">{weapon.type}</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">{weapon.range} range</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">DAMAGE</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${(weapon.damage / 200) * 100}%` }} />
                        </div>
                        <span className="text-cyan-400 font-mono">{weapon.damage}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">FIRE RATE</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500" style={{ width: `${(weapon.rpm / 1500) * 100}%` }} />
                        </div>
                        <span className="text-purple-400 font-mono">{weapon.rpm}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bestiary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BESTIARY_DATA.map((enemy, idx) => (
            <div key={idx} className="relative bg-black border border-slate-800 p-6 overflow-hidden group hover:border-white/30 transition-colors">
              <div 
                className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20" 
                style={{ backgroundColor: enemy.color }} 
              />
              <div className="relative z-10 flex flex-col h-full items-center text-center">
                {/* 3D Model Placeholder Representation */}
                <div className="w-full h-40 mb-4 border border-white/10 bg-slate-900/50 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
                      {[...Array(36)].map((_, i) => <div key={i} className="border border-white/5" />)}
                    </div>
                    <div style={{ color: enemy.color }} className="animate-pulse">
                      {enemy.isBoss ? <Skull size={64} /> : <Target size={48} />}
                    </div>
                    {enemy.isBoss && <div className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-0.5 font-bold tracking-widest">BOSS</div>}
                </div>

                <h3 className="text-xl font-bold tracking-widest" style={{ color: enemy.color, textShadow: `0 0 15px ${enemy.color}40` }}>{enemy.name}</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4 uppercase tracking-widest">{enemy.desc}</p>
                
                <div className="w-full mt-auto">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      <span>Threat Level</span>
                      <span style={{color: enemy.color}}>{'|'.repeat(enemy.danger)}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-900">
                      <div className="h-full transition-all duration-1000" style={{ width: `${(enemy.danger / 10) * 100}%`, backgroundColor: enemy.color }} />
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <SectionHeader title="Settings" subtitle="Tweak your social and lobby experience" />
    
    <Card glow="cyan">
      <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Gamepad2 size={18} className="text-cyan-400"/> Matchmaking</h3>
      <div className="space-y-4 text-sm text-slate-300">
        <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
          <span>Enable Crossplay</span>
          <input type="checkbox" defaultChecked className="accent-cyan-500 h-4 w-4" />
        </label>
        <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
          <span>Prioritize Low Ping</span>
          <input type="checkbox" defaultChecked className="accent-cyan-500 h-4 w-4" />
        </label>
        <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
          <span>Strict Skill Matching</span>
          <input type="checkbox" className="accent-cyan-500 h-4 w-4" />
        </label>
      </div>
    </Card>

    <Card glow="purple">
      <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Monitor size={18} className="text-purple-400"/> Graphics & UI</h3>
      <div className="space-y-4 text-sm text-slate-300">
        <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
          <span>Reduce Motion Blur</span>
          <input type="checkbox" className="accent-purple-500 h-4 w-4" />
        </label>
        <label className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded cursor-pointer">
          <span>Show FPS Counter</span>
          <input type="checkbox" defaultChecked className="accent-purple-500 h-4 w-4" />
        </label>
        <div className="p-2">
            <span className="block mb-2">Colorblind Mode</span>
            <select className="w-full bg-slate-900 border border-slate-700 text-white p-2 text-xs rounded">
              <option>Off</option>
              <option>Protanopia</option>
              <option>Deuteranopia</option>
              <option>Tritanopia</option>
            </select>
        </div>
      </div>
    </Card>

    <Card glow="orange">
      <h3 className="text-white text-lg mb-4 flex items-center gap-2"><Volume2 size={18} className="text-orange-400"/> Audio</h3>
      <div className="space-y-6 text-sm text-slate-300 p-2">
          <div>
            <div className="flex justify-between mb-1">
              <span>Master Volume</span>
              <span className="text-orange-400">80%</span>
            </div>
            <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span>Music Volume</span>
              <span className="text-orange-400">40%</span>
            </div>
            <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2"><Mic size={14}/> Voice Chat Enabled</span>
            <input type="checkbox" defaultChecked className="accent-orange-500 h-4 w-4" />
          </label>
      </div>
    </Card>
  </div>
);

const ClansView = () => (
  <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-96 text-center">
    <Shield size={64} className="text-slate-800 mb-4 animate-pulse" />
    <h2 className="text-2xl text-white font-bold mb-2">Clan Wars Offline</h2>
    <p className="text-slate-500 max-w-md">The next Clan War season begins in 3 days. Prepare your squad and optimize your loadouts.</p>
    <button className="mt-6 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest clip-path-polygon">Create Clan</button>
  </div>
);

/***********************************
 * MAIN APP LAYOUT
 ***********************************/

const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-4 px-6 py-4 transition-all duration-300 border-r-2 text-left ${
        activeTab === id
          ? 'bg-white/5 border-cyan-400 text-cyan-400'
          : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      <Icon size={20} className={activeTab === id ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : ''} />
      <span className="tracking-wider text-sm font-bold uppercase">{label}</span>
    </button>
  );

  return (
    <aside
      className={`${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:sticky top-16 md:top-0 z-40 w-64 h-[calc(100vh-64px)] md:h-screen bg-[#080808] border-r border-slate-800 flex flex-col transition-transform duration-300`}
    >
      <div className="hidden md:flex items-center justify-center h-20 border-b border-slate-800 bg-black/50">
        <GlitchText text="RIFT SOCIAL" className="text-2xl text-white" />
      </div>

      <div className="p-6 border-b border-slate-800/50 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 border border-slate-600 rounded-sm overflow-hidden bg-slate-900">
            <img src={CURRENT_USER.avatarUrl} alt="Avatar" className="w-full h-full bg-slate-800 object-cover" />
          </div>
          <div className="overflow-hidden">
            <div className="text-white font-bold truncate">{CURRENT_USER.username}</div>
            <div className="text-xs text-cyan-500">Level {CURRENT_USER.level}</div>
          </div>
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-500 bg-black/40 p-2 rounded border border-slate-800">
          <div className="flex items-center gap-1"><Hexagon size={10} className="text-cyan-500" /> {CURRENT_USER.currency.riftTokens}</div>
          <div className="flex items-center gap-1"><Zap size={10} className="text-purple-500" /> {CURRENT_USER.currency.plasmaCredits}</div>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
        <NavItem id="home" icon={Home} label="Dashboard" />
        <NavItem id="play" icon={Zap} label="Play" />
        <NavItem id="loadouts" icon={Target} label="Loadouts" />
        <NavItem id="profile" icon={User} label="My Profile" />
        <NavItem id="leaderboard" icon={Trophy} label="Leaderboards" />
        <NavItem id="clans" icon={Users} label="Clans" />
        <NavItem id="market" icon={ShoppingCart} label="Market" />
        <NavItem id="wiki" icon={Book} label="Wiki" />
        <NavItem id="settings" icon={Activity} label="Settings" />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full py-2 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 text-xs uppercase tracking-widest transition-colors font-bold">
          Log Out
        </button>
      </div>
    </aside>
  );
};

const TopStatusBar = () => (
  <header className="hidden md:flex justify-between items-center mb-10">
    <div className="text-xs text-slate-500 font-mono flex items-center gap-4">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> SERVERS ONLINE
      </span>
      <span>PING: 24ms</span>
      <span>PLAYERS: 124,592</span>
    </div>
    <div className="relative group">
      <input
        type="text"
        placeholder="SEARCH PLAYER / CLAN..."
        className="bg-black border border-slate-800 text-slate-300 px-4 py-2 w-64 text-sm focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all font-mono"
      />
      <Search className="absolute right-3 top-2.5 text-slate-600 w-4 h-4 group-focus-within:text-cyan-400" />
    </div>
  </header>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Background Grid Animation
  const Background = () => (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-20"
      style={{
        backgroundImage: 'linear-gradient(rgba(154,79,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(154,79,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        transform: 'perspective(500px) rotateX(20deg)',
        transformOrigin: 'top',
      }}
    />
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <Background />
      
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-black border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
        <GlitchText text="RIFT" className="text-xl text-white" />
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400 hover:text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex relative z-10">
        <Sidebar
          currentUser={CURRENT_USER}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-screen">
          <TopStatusBar />

          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'home' && <HomeView currentUser={CURRENT_USER} />}
            {activeTab === 'play' && <PlayView />}
            {activeTab === 'loadouts' && <LoadoutsView />}
            {activeTab === 'profile' && <ProfileView currentUser={CURRENT_USER} />}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'clans' && <ClansView />}
            {activeTab === 'market' && <MarketView />}
            {activeTab === 'wiki' && <WikiView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;