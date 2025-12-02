import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const { token } = useAuth();

    useEffect(() => {
        if (token) {
            socketService.connect(token);
            setIsConnected(true);

            socketService.on('disconnect', () => setIsConnected(false));

            return () => {
                socketService.disconnect();
            };
        }
    }, [token]);

    const send = (event, data) => {
        socketService.send(event, data);
    };

    const subscribe = (event, callback) => {
        socketService.on(event, callback);
        return () => socketService.off(event, callback);
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, send, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
