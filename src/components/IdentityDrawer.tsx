import { motion, AnimatePresence } from 'framer-motion'
import { X, Fingerprint, Copy, Check, ShieldAlert, Key, RefreshCw, PenTool } from 'lucide-react'
import { useState, useEffect } from 'react'
import { shortString } from 'starknet'
import { Identity } from '@semaphore-protocol/identity'
import type { StarknetWindowObject } from 'starknetkit'
import { FIELD_PRIME } from '../config/constants'

interface IdentityDrawerProps {
    isOpen: boolean
    onClose: () => void
    chainId: string | null
    signMessage: (typedData: any) => Promise<any>
    wallet: StarknetWindowObject | null
    address: string | null
}

export const IdentityDrawer = ({ isOpen, onClose, chainId, signMessage, address }: IdentityDrawerProps) => {
    const [isCopied, setIsCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [identity, setIdentity] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Clear identity when address changes
    useEffect(() => {
        setIdentity(null)
    }, [address])

    const handleGenerate = async () => {

        setIsGenerating(true)
        setError(null)

        let signature: any;
        try {
            // High-compatibility TypedData (using felt for maximum wallet support)
            // Clean chainId (remove underscores which can confuse some parsers)
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

            // Step 1: Request signature
            signature = await signMessage(typedData)
        } catch (err: any) {
            console.error('Signature failed:', err)
            const userRejected = err?.message?.toLowerCase().includes('user') || err?.message?.toLowerCase().includes('rejected')
            setError(userRejected ? 'Signature rejected by user.' : `Wallet error: ${err.message || 'Unknown error'}`)
            setIsGenerating(false)
            return
        }

        try {
            // Step 2: Generate stable seed from signature
            // signature is typically string[] (hex felts)
            const signatureSeed = Array.isArray(signature)
                ? signature.join('')
                : typeof signature === 'object'
                    ? JSON.stringify(signature)
                    : String(signature)

            // Step 3: Create Semaphore Identity (v4)
            // Storing ONLY the commitment in state as requested
            const semaIdentity = new Identity(signatureSeed)
            const felt = semaIdentity.commitment % FIELD_PRIME;
            setIdentity("0x" + felt.toString(16))

            setIsGenerating(false)
        } catch (err: any) {
            console.error('Identity creation failed:', err)
            setError(`Identity generation failed: ${err.message || 'Internal error'}`)
            setIsGenerating(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-[101] border-l border-neutral-100 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-black text-white rounded-sm">
                                    <Fingerprint className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold uppercase tracking-tight">Identity Hub</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-100 transition-colors rounded-sm cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-12">
                            {/* Info Section */}
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-6">Security Context</h3>
                                <div className="bg-neutral-50 border border-neutral-100 p-6 space-y-4">
                                    <div className="flex gap-4">
                                        <ShieldAlert className="w-5 h-5 text-black shrink-0" />
                                        <p className="text-sm leading-relaxed text-neutral-600">
                                            Your identity root is derived from your wallet signature. This ensures your privacy profile is unique and owned by you.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Action Section */}
                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-6">Initialization</h3>

                                {!identity ? (
                                    <div className="space-y-4">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="w-full bg-black text-white py-8 flex flex-col items-center justify-center gap-4 group hover:bg-neutral-800 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            {isGenerating ? (
                                                <RefreshCw className="w-6 h-6 animate-spin" />
                                            ) : (
                                                <PenTool className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                            )}
                                            <div className="text-center">
                                                <span className="block text-xs font-black uppercase tracking-[0.3em] font-mono">Create Identity Commitment</span>
                                                <span className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest">Sign to derive ZK root</span>
                                            </div>
                                        </button>
                                        {error && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{error}</p>}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border border-black p-6 space-y-6 bg-neutral-50 shadow-xl shadow-black/5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Identity Commitment</label>
                                                <p className="text-[9px] text-neutral-400 uppercase font-bold leading-tight mb-2">
                                                    This is your public identity. It can be shared and added to privacy groups.
                                                </p>
                                                <div className="flex items-center justify-between gap-4 bg-white p-3 border border-neutral-100">
                                                    <code className="text-[10px] font-mono font-bold break-all text-black line-clamp-2">{identity}</code>
                                                    <button onClick={() => copyToClipboard(identity)} className="p-2 hover:bg-neutral-50 transition-all cursor-pointer shrink-0">
                                                        {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setIdentity(null)}
                                            className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] border border-neutral-100 hover:border-black transition-all cursor-pointer"
                                        >
                                            Generate New Identity
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Stats/Persistence Section */}
                            <section>
                                <div className="border border-neutral-100 p-8 flex items-center gap-6">
                                    <div className="p-3 bg-neutral-50 rounded-full">
                                        <Key className="w-5 h-5 text-neutral-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest">On-Chain Status</h4>
                                        <p className="text-[10px] text-neutral-400 uppercase font-bold mt-1">Pending Registration</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-neutral-100">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
                                SemaCairo // Identity Layer // Starknet
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
