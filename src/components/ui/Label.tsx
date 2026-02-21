import React from 'react'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className = '', children, ...props }, ref) => {
        return (
            <label
                ref={ref}
                className={`text-[10px] font-black tracking-widest uppercase text-[var(--color-text-muted)] mb-1.5 block ${className}`}
                {...props}
            >
                {children}
            </label>
        )
    }
)

Label.displayName = 'Label'
