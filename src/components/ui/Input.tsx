import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', error, ...props }, ref) => {
        return (
            <div className="relative w-full">
                <input
                    ref={ref}
                    className={`flex w-full bg-[var(--color-surface-1)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] border ${
                        error ? 'border-red-500 focus:border-red-500' : 'border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)]'
                    } rounded-sm shadow-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 font-mono ${className}`}
                    {...props}
                />
                {error && (
                    <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
