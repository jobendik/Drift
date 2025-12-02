import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const profile = await api.getProfile(token);
                    setUser(profile);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error('Session expired', error);
                    logout();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, [token]);

    const register = async (email, username, password) => {
        setIsLoading(true);
        try {
            const response = await api.register(email, username, password);
            setToken(response.token);
            setUser(response.user);
            setIsAuthenticated(true);
            localStorage.setItem('auth_token', response.token);
            return true;
        } catch (error) {
            console.error('Registration failed', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        setIsLoading(true);
        try {
            const response = await api.login(email, password);
            setToken(response.token);
            setUser(response.user);
            setIsAuthenticated(true);
            localStorage.setItem('auth_token', response.token);
            return true;
        } catch (error) {
            console.error('Login failed', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth_token');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
