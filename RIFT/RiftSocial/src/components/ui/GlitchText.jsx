import React from 'react';

export const GlitchText = ({ text, className = '' }) => (
    <span className={`relative inline-block font-black tracking-[0.25em] ${className} glitch-text`} data-text={text}>
        {text}
    </span>
);
