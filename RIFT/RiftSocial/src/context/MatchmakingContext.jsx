import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const MatchmakingContext = createContext(null);

export const MatchmakingProvider = ({ children }) => {
    const { subscribe, send } = useWebSocket();
    const [isQueued, setIsQueued] = useState(false);
    const [queueTime, setQueueTime] = useState(0);
    const [matchFound, setMatchFound] = useState(null);

    useEffect(() => {
        let timer;
        if (isQueued) {
            timer = setInterval(() => setQueueTime(prev => prev + 1), 1000);
        } else {
            setQueueTime(0);
        }
        return () => clearInterval(timer);
    }, [isQueued]);

    useEffect(() => {
        const unsubMatch = subscribe('match_found', (match) => {
            setIsQueued(false);
            setMatchFound(match);
        });

        const unsubStart = subscribe('match_start', (data) => {
            console.log('Match starting!', data);
            // Redirect to game
            window.location.href = data.gameUrl;
        });

        return () => {
            unsubMatch();
            unsubStart();
        };
    }, [subscribe]);

    const startQueue = (modeId) => {
        setIsQueued(true);
        setMatchFound(null);
        send('start_queue', { modeId });
    };

    const cancelQueue = () => {
        setIsQueued(false);
        send('cancel_queue');
    };

    const acceptMatch = () => {
        send('accept_match', { matchId: matchFound.id });
        setMatchFound(null);
        // Navigate to game or show loading
    };

    const declineMatch = () => {
        setMatchFound(null);
        send('decline_match', { matchId: matchFound.id });
    };

    return (
        <MatchmakingContext.Provider value={{
            isQueued,
            queueTime,
            matchFound,
            startQueue,
            cancelQueue,
            acceptMatch,
            declineMatch
        }}>
            {children}
        </MatchmakingContext.Provider>
    );
};

export const useMatchmaking = () => {
    const context = useContext(MatchmakingContext);
    if (!context) {
        throw new Error('useMatchmaking must be used within a MatchmakingProvider');
    }
    return context;
};
