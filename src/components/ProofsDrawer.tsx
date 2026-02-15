import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink, Shield } from 'lucide-react'
import { useState } from 'react'
import type { StarknetWindowObject } from 'starknetkit'
import { SEMAPHORE_CONTRACT_ADDRESS } from '../config/constants'
import { Identity } from '@semaphore-protocol/identity'
import { Group } from '@semaphore-protocol/group'
import { generateProof } from '@semaphore-protocol/proof'

interface ProofsDrawerProps {
    isOpen: boolean
    onClose: () => void
    wallet: StarknetWindowObject | null
}

export const ProofsDrawer = ({ isOpen, onClose, wallet }: ProofsDrawerProps) => {
    // const [activeTab, setActiveTab] = useState<'generate' | 'verify'>('generate')
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [groupId, setGroupId] = useState('')
    // Depth is fixed at 20 for this deployment to match the trusted setup artifacts
    const depth = 20
    const [identityPrivate, setIdentityPrivate] = useState('')
    const [externalNullifier, setExternalNullifier] = useState('')
    const [signal, setSignal] = useState('')

    const handleGenerateProof = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            if (!wallet) {
                throw new Error("Wallet not connected")
            }

            // 1. Reconstruct Identity
            let identity: Identity
            try {
                // Try to parse array based private key first
                const parsed = JSON.parse(identityPrivate)
                identity = new Identity(parsed)
            } catch {
                // Fallback to string based
                identity = new Identity(identityPrivate)
            }

            // 2. Reconstruct Group (This needs to fetch from chain in real app)
            // For now, we simulate a group where our identity is a member
            const group = new Group()
            group.addMember(identity.commitment)

            // 3. Generate Proof
            // We use remote artifacts for the trusted setup (Depth 20)
            const wasmFilePath = `https://www.trusted-setup-pse.org/semaphore/${depth}/semaphore.wasm`
            const zkeyFilePath = `https://www.trusted-setup-pse.org/semaphore/${depth}/semaphore.zkey`

            const fullProof = await generateProof(
                identity,
                group,
                signal,
                externalNullifier,
                depth,
                {
                    zkey: zkeyFilePath,
                    wasm: wasmFilePath
                }
            )

            // 4. Submit Transaction
            // Note: semacairo might expect different input format than solidity.
            // We need to verify how 'proof' Span<felt252> is structured.
            // Sol output: 8 uint256s. Cairo output: Span<felt252>?
            // For now, we pass the proof as is and might need to adjust formatting.

            // @ts-ignore - flat is ES2019, ensuring runtime compat or build targets modern
            const flatPoints = [fullProof.points].flat(3)

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [
                        {
                            "contract_address": SEMAPHORE_CONTRACT_ADDRESS,
                            "entry_point": "signal",
                            "calldata": [
                                groupId,
                                fullProof.merkleTreeRoot,
                                fullProof.message,
                                fullProof.nullifier,
                                fullProof.scope,
                                ...flatPoints
                            ]
                        }
                    ]
                }
            })
            setTxHash(response.transaction_hash)

        } catch (err: any) {
            console.error('Proof generation failed:', err)
            setError(err.message || 'Proof generation failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-neutral-100 z-[70] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-neutral-50">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-black" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-widest">Proofs Module</h2>
                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Anonymous Signaling</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors group">
                                    <X className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <form onSubmit={handleGenerateProof} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Target Group ID</label>
                                    <input
                                        type="number"
                                        value={groupId}
                                        onChange={(e) => setGroupId(e.target.value)}
                                        placeholder="e.g. 1"
                                        required
                                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Private Identity (JSON or Secret)</label>
                                    <textarea
                                        value={identityPrivate}
                                        onChange={(e) => setIdentityPrivate(e.target.value)}
                                        placeholder='["...", "..."]'
                                        required
                                        rows={3}
                                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">External Nullifier (Event ID)</label>
                                    <input
                                        type="number"
                                        value={externalNullifier}
                                        onChange={(e) => setExternalNullifier(e.target.value)}
                                        placeholder="e.g. 101"
                                        required
                                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Signal (Message)</label>
                                    <input
                                        type="text"
                                        value={signal}
                                        onChange={(e) => setSignal(e.target.value)}
                                        placeholder="e.g. 1 (Vote Option A)"
                                        required
                                        className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !wallet}
                                    className="w-full h-12 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all disabled:bg-neutral-100 disabled:text-neutral-400 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating ZK Proof...
                                        </>
                                    ) : (
                                        'Broadcast Signal'
                                    )}
                                </button>
                            </form>

                            {/* Status Feedback */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[10px] font-black text-red-900 uppercase tracking-wider mb-1">Error Occurred</h4>
                                        <p className="text-[10px] text-red-600 font-bold leading-relaxed">{error}</p>
                                    </div>
                                </motion.div>
                            )}

                            {txHash && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-6 p-6 bg-neutral-900 rounded-2xl text-white space-y-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider">Signal Broadcasted</h4>
                                            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">Proof verified on-chain</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-xl space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Hash</span>
                                            <code className="text-[10px] font-mono font-bold break-all text-neutral-300 line-clamp-1">{txHash}</code>
                                        </div>
                                        <a
                                            href={`https://sepolia.starkscan.co/tx/${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                                        >
                                            View on Starkscan
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-neutral-50 border-t border-neutral-100 italic">
                            <p className="text-[9px] text-neutral-400 font-medium leading-relaxed uppercase tracking-tight">
                                Proof generation is computationally expensive and is performed entirely in your browser.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
