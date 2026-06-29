import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
    const baseClasses = "relative px-5 py-2.5 rounded-md font-medium cursor-pointer overflow-hidden transition-all duration-200 z-10";
    const variants = {
        primary: "bg-accent-lime text-black border-none hover:bg-accent-yellow hover:-translate-y-px",
        secondary: "bg-bg-tertiary text-text-primary border border-border hover:border-transparent hover:shadow-neon hover:-translate-y-px"
    };
    const isSecondary = variant === 'secondary';
    return (
        <button className={`${baseClasses} ${variants[variant]} ${className || ''}`} {...props}>
            <span className="relative z-10">{children}</span>
            {isSecondary && (
                <span className="absolute inset-0 -z-10 bg-gradient-mask animate-gradient-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
        </button>
    );
};