import React, { useEffect, useState } from 'react';
import './ThemeToggle.css';

function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className="theme-toggle-container">
            <span className="theme-icon">☀️</span>
            <label className="theme-switch">
                <input
                    type="checkbox"
                    checked={theme === 'light'}
                    onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />
                <span className="slider" />
            </label>
            <span className="theme-icon">🌙</span>
        </div>
    );
}

export default ThemeToggle;
