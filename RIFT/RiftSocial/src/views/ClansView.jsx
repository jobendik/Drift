import React from 'react';
import { Shield } from 'lucide-react';

export const ClansView = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center justify-center h-96 text-center">
        <Shield size={64} className="text-slate-800 mb-4 animate-pulse" />
        <h2 className="text-2xl text-white font-bold mb-2">Clan Wars Offline</h2>
        <p className="text-slate-500 max-w-md">The next Clan War season begins in 3 days. Prepare your squad and optimize your loadouts.</p>
        <button className="mt-6 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest clip-path-polygon">Create Clan</button>
    </div>
);
