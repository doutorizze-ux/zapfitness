import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const ThemeHandler = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (user?.primary_color) {
            document.documentElement.style.setProperty('--primary-color', user.primary_color);

            // Generate a slightly darker/lighter version for hover if needed
            // For now, let's just set the main one.
            // In a more advanced version, we could use a library to darken/lighten.
        } else {
            document.documentElement.style.setProperty('--primary-color', '#f97316');
        }
    }, [user?.primary_color]);

    return null; // This component doesn't render anything
};
