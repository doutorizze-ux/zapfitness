import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const ThemeHandler = () => {
    const { user } = useAuth();

    useEffect(() => {
        const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r} ${g} ${b}`;
        };

        if (user?.primary_color && /^#[0-9A-F]{6}$/i.test(user.primary_color)) {
            document.documentElement.style.setProperty('--primary-color', user.primary_color);
            document.documentElement.style.setProperty('--primary-rgb', hexToRgb(user.primary_color));
        } else {
            const defaultGreen = '#22c55e';
            document.documentElement.style.setProperty('--primary-color', defaultGreen);
            document.documentElement.style.setProperty('--primary-rgb', hexToRgb(defaultGreen));
        }
    }, [user?.primary_color]);

    return null; // This component doesn't render anything
};
