import {
    Zap,
    Clock,
    Target,
    Flame,
    Trophy,
    RotateCcw,
    Activity,
    Crosshair,
    Shield,
    Skull,
    Users,
    Flag,
    Hexagon,
    Lock
} from 'lucide-react';

export const CURRENT_USER = {
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

export const GAME_MODES = {
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

export const BESTIARY_DATA = [
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

export const LEADERBOARD_DATA = [
    { rank: 1, name: 'PHANTOM_X', kills: 15234, kdr: 3.42, avatar: '👑', clan: '[NVDA]' },
    { rank: 2, name: 'NEON_REAPER', kills: 14892, kdr: 3.28, avatar: '💀', clan: '[HACK]' },
    { rank: 3, name: 'VOID_STRIKER', kills: 14203, kdr: 3.15, avatar: '⚔️', clan: '[BUG]' },
    { rank: 4, name: 'CYPHER_GHOST', kills: 13847, kdr: 2.84, avatar: '🎯', clan: '[RIFT]' },
    { rank: 5, name: 'PLASMA_HUNTER', kills: 13402, kdr: 2.91, avatar: '🔫', clan: '[FAST]' },
];

export const MARKET_ITEMS = [
    { id: 1, name: 'Void Walker', type: 'Skin', rarity: 'Legendary', price: 2500, currency: 'plasma', image: 'text-purple-400' },
    { id: 2, name: 'Cyber Katana', type: 'Melee', rarity: 'Epic', price: 1200, currency: 'tokens', image: 'text-cyan-400' },
    { id: 3, name: 'Neon Trail', type: 'Effect', rarity: 'Rare', price: 800, currency: 'tokens', image: 'text-orange-400' },
    { id: 4, name: 'Glitch Protocol', type: 'Finisher', rarity: 'Legendary', price: 3000, currency: 'plasma', image: 'text-purple-400' },
];

export const WEAPONS_DATA = [
    { name: 'Plasma Rifle', damage: 35, rpm: 720, range: 'Medium', type: 'Assault' },
    { name: 'Neon Shotgun', damage: 120, rpm: 90, range: 'Close', type: 'Power' },
    { name: 'Void Sniper', damage: 180, rpm: 45, range: 'Long', type: 'Precision' },
    { name: 'Arc SMG', damage: 22, rpm: 1200, range: 'Close', type: 'Speed' },
];

export const MATCH_HISTORY = [
    { map: 'Neon District', mode: 'Deathmatch', k: 32, d: 11, result: 'WIN', ago: '2m ago' },
    { map: 'Cyber Plaza', mode: 'Team Clash', k: 28, d: 15, result: 'WIN', ago: '15m ago' },
    { map: 'Velocity Zone', mode: 'Capture', k: 19, d: 18, result: 'LOSS', ago: '1h ago' },
    { map: 'Neon District', mode: 'Deathmatch', k: 41, d: 9, result: 'WIN', ago: '3h ago' },
];

export const LOADOUTS = [
    { id: 1, name: 'Velocity Assault', role: 'Aggressive Entry', primary: 'Plasma Rifle', secondary: 'Arc SMG', sidearm: 'Neon Pistol', gadget: 'Motion Sensor', passive: 'Slide Booster' },
    { id: 2, name: 'Hyper SMG', role: 'Close-Quarters Control', primary: 'Arc SMG', secondary: 'Neon Shotgun', sidearm: 'Burst Pistol', gadget: 'Flash Charge', passive: 'Air Strafe' },
    { id: 3, name: 'Phantom Sniper', role: 'Long-Range Pick', primary: 'Void Sniper', secondary: 'Plasma Rifle', sidearm: 'Silenced Pistol', gadget: 'Holo Decoy', passive: 'Low Profile' },
];
