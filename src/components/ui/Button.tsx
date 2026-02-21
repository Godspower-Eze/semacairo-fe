import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
        const baseStyles = "relative inline-flex items-center justify-center font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none"
        
        const variants = {
            primary: "bg-[var(--color-text)] text-[var(--color-surface-0)] hover:opacity-90 border border-transparent rounded-sm",
            secondary: "bg-transparent text-[var(--color-text)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-text)] hover:text-[var(--color-surface-0)] rounded-sm",
            ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-sm",
            danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent rounded-sm"
        }

        const sizeStyles = "px-6 py-3"
        const combinedStyles = `${baseStyles} ${variants[variant]} ${sizeStyles} ${className}`

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={combinedStyles}
                {...props}
            >
                {isLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <span className={isLoading ? 'opacity-0 absolute' : ''}>
                    {children}
                </span>
                {isLoading && (
                    <span>PROCESSING...</span>
                )}
            </button>
        )
    }
)

Button.displayName = 'Button'
