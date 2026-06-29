import React from 'react';

export const Loader: React.FC = () => (
    <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-accent-lime border-t-transparent rounded-full animate-spin" />
    </div>
);