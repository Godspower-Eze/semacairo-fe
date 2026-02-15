import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Plus, UserPlus, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { StarknetWindowObject } from 'starknetkit'
import { cairo } from "starknet";

import { SEMAPHORE_CONTRACT_ADDRESS } from '../config/constants'

interface GroupsDrawerProps {
    isOpen: boolean
    onClose: () => void
    wallet: StarknetWindowObject | null
}

export const GroupsDrawer = ({ isOpen, onClose, wallet }: GroupsDrawerProps) => {
    const [activeTab, setActiveTab] = useState<'create' | 'add'>('create')
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [groupId, setGroupId] = useState('')
    const depth = '20'
    const [identityCommitment, setIdentityCommitment] = useState('')

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            if (!wallet) {
                throw new Error("Wallet not connected")
            }

            const gid = cairo.uint256(groupId);

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [
                        {
                            "contract_address": SEMAPHORE_CONTRACT_ADDRESS,
                            "entry_point": "create_group",
                            "calldata": [gid.low.toString(), gid.high.toString(), depth]
                        }
                    ]
                }
            })

            setTxHash(response.transaction_hash)

            // Clear form
            setGroupId('')
        } catch (err: any) {
            console.error('Create group failed:', err)
            setError(err.message || 'Transaction failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            if (!wallet) {
                throw new Error("Wallet not connected")
            }

            const gid = cairo.uint256(groupId);

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [
                        {
                            "contract_address": SEMAPHORE_CONTRACT_ADDRESS,
                            "entry_point": "add_member",
                            "calldata": [gid.low.toString(), gid.high.toString(), identityCommitment]
                        }
                    ]
                }
            })

            setTxHash(response.transaction_hash)

            // Clear form (keeping group id might be useful for batch adding, but clearing for safety)
            setIdentityCommitment('')
        } catch (err: any) {
            console.error('Add member failed:', err)
            setError(err.message || 'Transaction failed')
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
                                        <Users className="w-5 h-5 text-black" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-widest">Groups Hub</h2>
                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">On-chain Management</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors group">
                                    <X className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                                <button
                                    onClick={() => { setActiveTab('create'); setError(null); setTxHash(null); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'create' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <Plus className="w-3 h-3" />
                                    Create Group
                                </button>
                                <button
                                    onClick={() => { setActiveTab('add'); setError(null); setTxHash(null); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'add' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <UserPlus className="w-3 h-3" />
                                    Add Member
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">
                                {activeTab === 'create' ? (
                                    <form onSubmit={handleCreateGroup} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Group ID (Number)</label>
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
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Tree Depth (Fixed)</label>
                                            <input
                                                type="number"
                                                value={depth}
                                                readOnly
                                                className="w-full px-4 py-3 bg-neutral-100 border border-neutral-100 rounded-xl text-xs font-bold text-neutral-500 cursor-not-allowed focus:outline-none transition-all"
                                            />
                                            <p className="text-[9px] text-neutral-400 font-medium leading-relaxed italic">
                                                Standard depth for this deployment (2^20 members).
                                            </p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full h-12 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all disabled:bg-neutral-100 disabled:text-neutral-400 flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Initialize Group On-chain'
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleAddMember} className="space-y-6">
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
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Identity Commitment (Public)</label>
                                            <textarea
                                                value={identityCommitment}
                                                onChange={(e) => setIdentityCommitment(e.target.value)}
                                                placeholder="0x..."
                                                required
                                                rows={3}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all resize-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full h-12 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all disabled:bg-neutral-100 disabled:text-neutral-400 flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Add Member to Group'
                                            )}
                                        </button>
                                    </form>
                                )}

                                {/* Status Feedback */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
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
                                        className="p-6 bg-neutral-900 rounded-2xl text-white space-y-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-wider">Transaction Sent</h4>
                                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">Waiting for inclusion</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white/5 rounded-xl space-y-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Hash</span>
                                                <code className="text-[10px] font-mono font-bold break-all text-neutral-300 line-clamp-1">{txHash}</code>
                                            </div>
                                            <a
                                                href={`https://sepolia.voyager.online/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors"
                                            >
                                                View on Voyager
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-neutral-50 border-t border-neutral-100 italic">
                            <p className="text-[9px] text-neutral-400 font-medium leading-relaxed uppercase tracking-tight">
                                Careful: Group operations are immutable and require gas. Verify the Group ID before initializing.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
