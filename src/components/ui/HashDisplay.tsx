import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export interface HashDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
    hash: string
    preserveLength?: boolean
}

export const HashDisplay = React.forwardRef<HTMLDivElement, HashDisplayProps>(
    ({ className = '', hash, preserveLength = false, ...props }, ref) => {
        const [copied, setCopied] = useState(false)

        const handleCopy = () => {
            navigator.clipboard.writeText(hash)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }

        const displayHash = preserveLength 
            ? hash 
            : hash.length > 30 
                ? `${hash.slice(0, 10)}...${hash.slice(-8)}` 
                : hash;

        return (
            <div
                ref={ref}
                onClick={handleCopy}
                className={`group relative inline-flex items-center gap-2 bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-sm cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors ${className}`}
                title="Click to copy full hash"
                {...props}
            >
                <code className={`text-[var(--color-text-muted)] font-mono text-[10px] sm:text-xs font-bold leading-normal tracking-tight ${preserveLength ? 'break-all whitespace-normal' : ''}`}>
                    {displayHash}
                </code>
                
                <div className="flex-shrink-0">
                    {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                        <Copy className="w-3 h-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                    )}
                </div>
            </div>
        )
    }
)

HashDisplay.displayName = 'HashDisplay'
