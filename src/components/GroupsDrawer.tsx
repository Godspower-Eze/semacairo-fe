import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Plus, UserPlus, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { StarknetWindowObject } from 'starknetkit'
import { cairo } from "starknet";

import { SEMACAIRO_CONTRACT_ADDRESS } from '../config/constants'
import { Identity } from '@semaphore-protocol/identity'

import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { HashDisplay } from './ui/HashDisplay'
import { Card, CardContent } from './ui/Card'

interface GroupsDrawerProps {
    isOpen: boolean
    onClose: () => void
    wallet: StarknetWindowObject | null
    identity: Identity | null
    onOpenIdentity: () => void
    initialGroupId?: string
    initialTab?: 'create' | 'add'
}

export const GroupsDrawer = ({ isOpen, onClose, wallet, identity, onOpenIdentity, initialGroupId, initialTab }: GroupsDrawerProps) => {
    const [activeTab, setActiveTab] = useState<'create' | 'add'>(initialTab || 'create')
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [groupId, setGroupId] = useState(initialGroupId || '')
    const [depth, setDepth] = useState('20')
    const [identityCommitment, setIdentityCommitment] = useState('')

    // Reset state when drawer opens with new props
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab || 'create')
            setGroupId(initialGroupId || '')
            setError(null)
            setTxHash(null)
        }
    }, [isOpen, initialGroupId, initialTab])

    const activeIdentityCommitment = identity
        ? "0x" + (identity.commitment).toString(16)
        : null

    const handleCreateGroup = async (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            if (!wallet) throw new Error("Wallet not connected")
            const gid = cairo.uint256(groupId);
            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [{
                        "contract_address": SEMACAIRO_CONTRACT_ADDRESS,
                        "entry_point": "create_group",
                        "calldata": [gid.low.toString(), gid.high.toString(), depth]
                    }]
                }
            })
            setTxHash(response.transaction_hash)
            setGroupId('')
        } catch (err: any) {
            console.error('Create group failed:', err)
            setError(err.message || 'Transaction failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddMember = async (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setTxHash(null)

        try {
            if (!wallet) throw new Error("Wallet not connected")
            const gid = cairo.uint256(groupId);
            const identityCommitmentUint256 = cairo.uint256(identityCommitment);
            
            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [{
                        "contract_address": SEMACAIRO_CONTRACT_ADDRESS,
                        "entry_point": "add_member",
                        "calldata": [gid.low.toString(), gid.high.toString(), identityCommitmentUint256.low.toString(), identityCommitmentUint256.high.toString()]
                    }]
                }
            })
            setTxHash(response.transaction_hash)
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--color-surface-0)] border-l border-[var(--color-border-subtle)] z-[70] shadow-2xl overflow-hidden flex flex-col font-sans text-[var(--color-text)]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] rounded-sm text-[var(--color-text)]">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-widest leading-tight text-[var(--color-text)] text-sm">GROUPS</h2>
                                    </div>
                                </div>
                                <Button variant="ghost" onClick={onClose} className="!px-3 !py-2">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 p-1 bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                                <button
                                    onClick={() => { setActiveTab('create'); setError(null); setTxHash(null); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'create' ? 'bg-[var(--color-text)] text-[var(--color-surface-0)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                                >
                                    <Plus className="w-3 h-3" />
                                    INITIALIZE GROUP
                                </button>
                                <button
                                    onClick={() => { setActiveTab('add'); setError(null); setTxHash(null); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'add' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                                    }`}
                                >
                                    <UserPlus className="w-3 h-3" />
                                    ADD MEMBER
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">
                                {activeTab === 'create' ? (
                                    <form onSubmit={handleCreateGroup} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>GROUP IDENTIFIER (NUMERIC)</Label>
                                            <Input
                                                type="number"
                                                value={groupId}
                                                onChange={(e) => setGroupId(e.target.value)}
                                                placeholder="e.g. 42"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>MERKLE TREE DEPTH</Label>
                                            <Input
                                                type="number"
                                                value={depth}
                                                onChange={(e) => setDepth(e.target.value)}
                                                placeholder="e.g. 20"
                                                min="1"
                                                max="32"
                                                required
                                            />
                                            <p className="text-[10px] text-neutral-500 font-mono mt-2">
                                                &gt; Defines maximum capacity (2^DEPTH). Standard is 20. Max 32.
                                            </p>
                                        </div>
                                        <Button
                                            type="submit"
                                            isLoading={isLoading}
                                            className="w-full mt-4"
                                        >
                                            INITIALIZE GROUP ON-CHAIN
                                        </Button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleAddMember} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label>TARGET GROUP ID</Label>
                                            <Input
                                                type="number"
                                                value={groupId}
                                                onChange={(e) => setGroupId(e.target.value)}
                                                placeholder="e.g. 42"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <Label>IDENTITY COMMITMENT TO ENROLL</Label>

                                                {/* Identity Selection Options */}
                                                <div className="mb-4">
                                                    {activeIdentityCommitment ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIdentityCommitment(activeIdentityCommitment)}
                                                            className={`w-full p-4 border text-left transition-all relative ${
                                                                identityCommitment === activeIdentityCommitment
                                                                    ? 'border-white bg-white/5'
                                                                    : 'border-white/10 hover:border-white/30 bg-black'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                    LOCAL IDENTITY
                                                                </span>
                                                                {identityCommitment === activeIdentityCommitment && (
                                                                    <span className="text-[10px] font-black text-white bg-white/20 px-2 py-0.5">SELECTED</span>
                                                                )}
                                                            </div>
                                                            <HashDisplay hash={activeIdentityCommitment} />
                                                        </button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={onOpenIdentity}
                                                            className="w-full border-dashed !py-6 text-neutral-500 hover:text-white"
                                                        >
                                                            NO LOCAL IDENTITY DETECTED. CLICK TO INITIALIZE.
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Manual Input Fallback */}
                                                <div className="space-y-2 pt-2 border-t border-white/5">
                                                    <Label className="text-neutral-500">OR PROVIDE EXTERNAL COMMITMENT (RAW HEX)</Label>
                                                    <textarea
                                                        value={identityCommitment}
                                                        onChange={(e) => setIdentityCommitment(e.target.value)}
                                                        placeholder="0x..."
                                                        required
                                                        rows={2}
                                                        className="w-full px-4 py-3 bg-neutral-900 border border-white/10 text-xs font-mono text-white placeholder-neutral-700 focus:outline-none focus:border-white transition-all resize-none rounded-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="submit"
                                            isLoading={isLoading}
                                            className="w-full mt-4"
                                        >
                                            ADD MEMBER TO GROUP
                                        </Button>
                                    </form>
                                )}

                                {/* Status Feedback */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-950/20 border border-red-900/50 flex items-start gap-4"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">TRANSACTION FAILED</h4>
                                            <p className="text-[10px] font-mono text-red-400 capitalize-first">{error}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {txHash && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4"
                                    >
                                        <Card className="border-emerald-900/50 bg-neutral-900">
                                            <CardContent className="p-5 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-emerald-950 flex items-center justify-center border border-emerald-900/50">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">BROADCAST SUCCESSFUL</h4>
                                                        <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest mt-0.5">AWAITING L2 INCLUSION</p>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-black border border-white/5 space-y-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">TX HASH RECIEPT</span>
                                                        <HashDisplay hash={txHash} />
                                                    </div>
                                                    <a
                                                        href={`https://sepolia.voyager.online/tx/${txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-2"
                                                    >
                                                        VIEW EXPLORER <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/10 bg-black">
                            <p className="text-[10px] text-neutral-600 font-mono font-bold leading-relaxed uppercase tracking-widest text-center">
                                MATRICES ARE IMMUTABLE. VERIFY PARAMETERS.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
