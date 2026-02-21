import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'danger' | 'success' | 'dashed'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'default', children, ...props }, ref) => {
        const variants = {
            default: "bg-[var(--color-surface-0)] border border-[var(--color-border-subtle)] text-[var(--color-text)]",
            elevated: "bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] text-[var(--color-text)]",
            danger: "bg-[var(--color-surface-0)] border border-red-900/50 text-red-500",
            success: "bg-[var(--color-surface-0)] border border-emerald-900/50 text-emerald-500",
            dashed: "bg-transparent border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] transition-colors"
        }

        return (
            <div
                ref={ref}
                className={`rounded-sm overflow-hidden ${variants[variant]} ${className}`}
                {...props}
            >
                {children}
            </div>
        )
    }
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div ref={ref} className={`px-6 py-4 border-b border-inherit ${className}`} {...props} />
    )
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className = '', ...props }, ref) => (
        <h3 ref={ref} className={`text-xs font-black uppercase tracking-widest ${className}`} {...props} />
    )
)
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div ref={ref} className={`p-6 ${className}`} {...props} />
    )
)
CardContent.displayName = 'CardContent'
