import React from 'react';

export const Background = () => (
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
