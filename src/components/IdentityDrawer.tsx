import { motion, AnimatePresence } from 'framer-motion'
import { X, Fingerprint, ShieldAlert, Key } from 'lucide-react'
import { useState, useEffect } from 'react'
import { shortString } from 'starknet'
import { Identity } from '@semaphore-protocol/identity'
import type { StarknetWindowObject } from 'starknetkit'

import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { HashDisplay } from './ui/HashDisplay'

interface IdentityDrawerProps {
    isOpen: boolean
    onClose: () => void
    chainId: string | null
    signMessage: (typedData: any) => Promise<any>
    wallet: StarknetWindowObject | null
    address: string | null
    identity: Identity | null
    setIdentity: (identity: Identity | null) => void
}

export const IdentityDrawer = ({ isOpen, onClose, chainId, signMessage, address, identity, setIdentity }: IdentityDrawerProps) => {
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showProtectedKeys, setShowProtectedKeys] = useState(false)

    // Clear identity when address changes
    useEffect(() => {
        setIdentity(null)
        setShowProtectedKeys(false)
    }, [address, setIdentity])

    // Reset view toggle on close
    useEffect(() => {
        if (!isOpen) {
            setShowProtectedKeys(false)
        }
    }, [isOpen])

    const handleGenerate = async () => {
        setIsGenerating(true)
        setError(null)

        let signature: any;
        try {
            // High-compatibility TypedData
            const cleanChainId = chainId

            const typedData = {
                types: {
                    StarkNetDomain: [
                        { name: "name", type: "felt" },
                        { name: "version", type: "felt" },
                        { name: "chainId", type: "felt" },
                    ],
                    Message: [
                        { name: "contents", type: "felt" },
                    ],
                },
                primaryType: "Message",
                domain: {
                    name: shortString.encodeShortString("SemaCairo"),
                    version: shortString.encodeShortString("1"),
                    chainId: cleanChainId,
                },
                message: {
                    contents: shortString.encodeShortString("Create Identity Commitment"),
                },
            }

            signature = await signMessage(typedData)
        } catch (err: any) {
            console.error('Signature failed:', err)
            const userRejected = err?.message?.toLowerCase().includes('user') || err?.message?.toLowerCase().includes('rejected')
            setError(userRejected ? 'Signature rejected by user.' : `Wallet error: ${err.message || 'Unknown error'}`)
            setIsGenerating(false)
            return
        }

        try {
            const signatureSeed = Array.isArray(signature)
                ? signature.join('')
                : typeof signature === 'object'
                    ? JSON.stringify(signature)
                    : String(signature)

            const semaIdentity = new Identity(signatureSeed)
            setIdentity(semaIdentity)
            setIsGenerating(false)
        } catch (err: any) {
            console.error('Identity creation failed:', err)
            setError(`Identity generation failed: ${err.message || 'Internal error'}`)
            setIsGenerating(false)
        }
    }

    const identityCommitment = identity ? "0x" + (identity.commitment).toString(16) : null
    const privateKey = identity ? identity.export() : null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--color-surface-0)] shadow-2xl z-[101] border-l border-[var(--color-border-subtle)] flex flex-col font-sans text-[var(--color-text)]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] rounded-sm">
                                    <Fingerprint className="w-5 h-5 text-[var(--color-text)]" />
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-widest text-[var(--color-text)]">IDENTITY</h2>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="!px-3 !py-2"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {/* Security Notice */}
                            <section>
                                <div className="border border-[var(--color-border-subtle)] p-5 bg-[var(--color-surface-1)] flex gap-4">
                                    <ShieldAlert className="w-5 h-5 shrink-0 text-[var(--color-text-muted)] mt-0.5" />
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-text)]">Deterministic Root</h3>
                                        <p className="text-xs leading-relaxed text-[var(--color-text-muted)] font-mono">
                                            &gt; Your zero-knowledge identity is mathematically derived directly from your wallet signature. It cannot be lost while you control the wallet keys.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">CRYPTOGRAPHIC ROOT</h3>
                                    <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
                                </div>

                                {!identityCommitment ? (
                                    <div className="space-y-4">
                                        <Button
                                            onClick={handleGenerate}
                                            isLoading={isGenerating}
                                            variant="secondary"
                                            className="w-full !py-12 flex flex-col items-center justify-center gap-4 group border-dashed"
                                        >
                                            <Fingerprint className="w-8 h-8 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" />
                                            <span className="text-center font-mono font-bold tracking-[0.2em] text-xs">INITIALIZE IDENTITY</span>
                                        </Button>
                                        {error && <p className="text-[10px] text-red-500 font-mono text-center uppercase border border-red-900/50 bg-red-950/20 p-3">{error}</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Public Commitment */}
                                        <Card variant="elevated" className="border-emerald-900/50 bg-[var(--color-surface-1)] text-left">
                                            <CardContent className="p-5 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        IDENTITY COMMITMENT (PUBLIC)
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-[var(--color-text-muted)] font-mono mb-2 border-l-2 border-emerald-900 pl-3">
                                                    This is your public identifier. Share this safely to be added to Cryptographic Sets.
                                                </p>
                                                <div className="w-full">
                                                    <HashDisplay 
                                                        hash={identityCommitment} 
                                                        preserveLength 
                                                        className="w-full !bg-[var(--color-surface-0)] border-[var(--color-border-subtle)] !py-4" 
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Progressive Disclosure for Secrets */}
                                        <div className="border border-[var(--color-border-subtle)] p-5 bg-[var(--color-surface-1)] space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                                                    <Key className="w-4 h-4" />
                                                    <span className="text-xs font-black uppercase tracking-widest">PROTECTED KEYS</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setShowProtectedKeys(!showProtectedKeys)}
                                                    className="!px-3 !py-1 !text-[10px]"
                                                >
                                                    {showProtectedKeys ? '[ HIDE SECRETS ]' : '[ REVEAL SECRETS ]'}
                                                </Button>
                                            </div>

                                            {showProtectedKeys && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="pt-4 border-t border-white/10 flex flex-col gap-4 overflow-hidden"
                                                >
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-mono uppercase tracking-widest text-red-500">PRIVATE KEY (BASE64)</label>
                                                        <HashDisplay hash={privateKey!} preserveLength className="w-full justify-between !bg-black" />
                                                    </div>
                                                    <div className="bg-red-950/20 border border-red-900/50 p-3 mt-2">
                                                        <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest">
                                                            WARNING: NEVER SHARE THIS KEY. COMPROMISE LEADS TO COMPLETE LOSS OF ANONYMITY.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/10 bg-black">
                            <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest text-center">
                                SECURE TERMINAL CONNECTION ESTABLISHED
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

