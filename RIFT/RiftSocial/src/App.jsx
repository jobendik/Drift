import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { GlitchText } from './components/ui/GlitchText';
import { Sidebar } from './components/layout/Sidebar';
import { TopStatusBar } from './components/layout/TopStatusBar';
import { Background } from './components/layout/Background';
import { HomeView } from './views/HomeView';
import { PlayView } from './views/PlayView';
import { LoadoutsView } from './views/LoadoutsView';
import { ProfileView } from './views/ProfileView';
import { LeaderboardView } from './views/LeaderboardView';
import { ShopView } from './views/ShopView';
import { WikiView } from './views/WikiView';
import { SettingsView } from './views/SettingsView';
import { ClansView } from './views/ClansView';
import { AuthView } from './views/AuthView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { SocialProvider } from './context/SocialContext';
import { ChatProvider } from './context/ChatContext';
import { MatchmakingProvider } from './context/MatchmakingContext';

import { FriendList } from './components/layout/FriendList';
import { ChatWindow } from './components/layout/ChatWindow';
import { PartyPanel } from './components/layout/PartyPanel';
import { MatchFoundModal } from './components/layout/MatchFoundModal';

const AuthenticatedApp = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                    currentUser={user}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    onLogout={logout}
                />

                <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-screen xl:mr-64">
                    <TopStatusBar />

                    <div className="max-w-7xl mx-auto pb-20">
                        {activeTab === 'home' && <HomeView currentUser={user} />}
                        {activeTab === 'play' && <PlayView />}
                        {activeTab === 'loadouts' && <LoadoutsView />}
                        {activeTab === 'profile' && <ProfileView currentUser={user} />}
                        {activeTab === 'leaderboard' && <LeaderboardView />}
                        {activeTab === 'clans' && <ClansView />}
                        {activeTab === 'shop' && <ShopView />}
                        {activeTab === 'wiki' && <WikiView />}
                        {activeTab === 'settings' && <SettingsView />}
                    </div>
                </main>

                <FriendList />
            </div>
        </div>
    );
};

const AppContent = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-cyan-500 animate-pulse font-mono tracking-widest">INITIALIZING RIFT PROTOCOL...</div>
            </div>
        );
    }

    return isAuthenticated ? <AuthenticatedApp /> : <AuthView />;
};

const App = () => {
    return (
        <AuthProvider>
            <WebSocketProvider>
                <SocialProvider>
                    <ChatProvider>
                        <MatchmakingProvider>
                            <AppContent />
                            <ChatWindow />
                            <PartyPanel />
                            <MatchFoundModal />
                        </MatchmakingProvider>
                    </ChatProvider>
                </SocialProvider>
            </WebSocketProvider>
        </AuthProvider>
    );
};

export default App;
