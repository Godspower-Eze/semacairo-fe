import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink, Shield, Send, BadgeCheck, Copy } from 'lucide-react'
import { useState } from 'react'
import React from 'react'
import type { StarknetWindowObject } from 'starknetkit'
import { Identity } from '@semaphore-protocol/identity'
import { Group } from '@semaphore-protocol/group'
import { generateProof, verifyProof } from '@semaphore-protocol/proof'
import { type PackedGroth16Proof } from '@zk-kit/utils'
import { cairo } from 'starknet'

import { keccakHash, normalizePackedProof, toNumericString, getGroupDepth, fetchGroupMembers, generateCalldata } from '../utils/common';
import { SEMAPHORE_CONTRACT_ADDRESS } from '../config/constants';

interface ProofsDrawerProps {
    isOpen: boolean
    onClose: () => void
    wallet: StarknetWindowObject | null
    identity: Identity | null
    onOpenIdentity: () => void
    initialGroupId?: string
}

type GeneratedProof = {
    merkleTreeDepth: number
    merkleTreeRoot: string
    nullifier: string
    message: string
    scope: string
    points: PackedGroth16Proof
}

const createEmptyPackedProof = (): PackedGroth16Proof => ['', '', '', '', '', '', '', '']

export const ProofsDrawer = ({ isOpen, onClose, wallet, identity, onOpenIdentity, initialGroupId }: ProofsDrawerProps) => {
    const [activeTab, setActiveTab] = useState<'send' | 'verify'>('send')
    const [isLoading, setIsLoading] = useState(false)
    const [txHash, setTxHash] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState<string>('')
    const [generatedProof, setGeneratedProof] = useState<GeneratedProof | null>(null)
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [verifyStatus, setVerifyStatus] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyResult, setVerifyResult] = useState<boolean | null>(null)

    // Form states
    const [groupId, setGroupId] = useState(initialGroupId || '')
    const [message, setMessage] = useState('')
    const [scope, setScope] = useState('0') // Set default scope to 0

    // Reset state when drawer opens with new props
    React.useEffect(() => {
        if (isOpen) {
            setGroupId(initialGroupId || '')
            setActiveTab('send') // Or you could pass initialTab as well
            setError(null)
            setTxHash(null)
            setStatus('')
        }
    }, [isOpen, initialGroupId])
    const [verifyMerkleTreeDepth, setVerifyMerkleTreeDepth] = useState('20')
    const [verifyMerkleTreeRoot, setVerifyMerkleTreeRoot] = useState('')
    const [verifyNullifier, setVerifyNullifier] = useState('')
    const [verifyMessage, setVerifyMessage] = useState('')
    const [verifyScope, setVerifyScope] = useState('')
    const [verifyPoints, setVerifyPoints] = useState<PackedGroth16Proof>(createEmptyPackedProof)
    const [verifyJsonInput, setVerifyJsonInput] = useState('')

    // Derive commitment for UI feedback
    const identityCommitment = identity
        ? "0x" + identity.commitment.toString(16)
        : null

    const handleGenerateProof = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setTxHash(null)
        setGeneratedProof(null)
        setCopyFeedback(null)
        setStatus('Fetching group members from chain...')

        try {
            if (!wallet) {
                throw new Error("Wallet not connected")
            }

            if (!identity) {
                throw new Error("Identity not found. Please generate one first.")
            }

            // 1. Fetch members from chain and reconstruct group
            const members = await fetchGroupMembers(groupId)

            if (members.length === 0) {
                throw new Error(`No members found for group ${groupId}. Add members first.`)
            }
            
            const group = new Group(members)

            setStatus(`Found ${members.length} member(s). Sealing message...`)

            const depth = await getGroupDepth(groupId)

            const fullProof = await generateProof(
                identity,
                group,
                message,
                scope,
                depth
            )

            const publicInputs = [
                BigInt(fullProof.merkleTreeRoot),
                BigInt(fullProof.nullifier),
                BigInt(keccakHash(fullProof.message)),
                BigInt(keccakHash(fullProof.scope)),
            ];

            const calldata = await generateCalldata(
                fullProof.points,
                publicInputs,
                depth
            )

            setGeneratedProof(fullProof)
            setStatus('Message prepared. Submitting transaction...')

            const gid = cairo.uint256(groupId);
            const merkleTreeRootUint256 = cairo.uint256(fullProof.merkleTreeRoot);
            const nullifierUint256 = cairo.uint256(fullProof.nullifier);
            const messageUint256 = cairo.uint256(keccakHash(fullProof.message));
            const scopeUint256 = cairo.uint256(keccakHash(fullProof.scope));

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [
                        {
                            "contract_address": SEMAPHORE_CONTRACT_ADDRESS,
                            "entry_point": "send_message",
                            "calldata": [
                                gid.low.toString(),
                                gid.high.toString(),
                                merkleTreeRootUint256.low.toString(),
                                merkleTreeRootUint256.high.toString(),
                                nullifierUint256.low.toString(),
                                nullifierUint256.high.toString(),
                                messageUint256.low.toString(),
                                messageUint256.high.toString(),
                                scopeUint256.low.toString(),
                                scopeUint256.high.toString(),
                                ...calldata
                            ]
                        }
                    ]
                }
            })
            console.log(response)
            setTxHash(response.transaction_hash)
            setStatus('')

        } catch (err: any) {
            console.error('Message send failed:', err)
            setError(err.message || 'Message send failed')
            setStatus('')
        } finally {
            setIsLoading(false)
        }
    }

    const parseProofJson = (input: string): GeneratedProof => {
        let parsed: any

        try {
            parsed = JSON.parse(input)
        } catch (error) {
            throw new Error('Invalid JSON format.')
        }

        const merkleTreeDepth = Number(parsed?.merkleTreeDepth)

        if (!Number.isFinite(merkleTreeDepth)) {
            throw new Error('Proof JSON is missing a valid merkleTreeDepth.')
        }

        if (!parsed?.merkleTreeRoot) {
            throw new Error('Proof JSON is missing merkleTreeRoot.')
        }

        if (!parsed?.nullifier) {
            throw new Error('Proof JSON is missing nullifier.')
        }

        if (parsed?.message === undefined) {
            throw new Error('Proof JSON is missing message.')
        }

        if (parsed?.scope === undefined) {
            throw new Error('Proof JSON is missing scope.')
        }

        const points = normalizePackedProof(parsed?.points)

        return {
            merkleTreeDepth,
            merkleTreeRoot: String(parsed.merkleTreeRoot),
            nullifier: String(parsed.nullifier),
            message: toNumericString(String(parsed.message)),
            scope: toNumericString(String(parsed.scope)),
            points
        }
    }

    const applyProofToVerifyFields = (proof: GeneratedProof) => {
        setVerifyMerkleTreeDepth(String(proof.merkleTreeDepth))
        setVerifyMerkleTreeRoot(proof.merkleTreeRoot)
        setVerifyNullifier(proof.nullifier)
        setVerifyMessage(proof.message)
        setVerifyScope(proof.scope)
        setVerifyPoints([...proof.points] as PackedGroth16Proof)
    }

    const handleVerifyProof = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsVerifying(true)
        setVerifyError(null)
        setVerifyResult(null)
        setVerifyStatus('Validating proof...')

        try {
            const jsonInput = verifyJsonInput.trim()

            if (jsonInput) {
                const parsedProof = parseProofJson(jsonInput)
                applyProofToVerifyFields(parsedProof)
                const result = await verifyProof(parsedProof)
                setVerifyResult(result)
                setVerifyStatus('')
                return
            }

            const depth = Number(verifyMerkleTreeDepth)

            if (!Number.isFinite(depth)) {
                throw new Error('Merkle tree depth must be a number.')
            }

            if (!verifyMerkleTreeRoot.trim()) {
                throw new Error('Merkle tree root is required.')
            }

            if (!verifyNullifier.trim()) {
                throw new Error('Nullifier is required.')
            }

            if (!verifyMessage.trim()) {
                throw new Error('Message is required.')
            }

            if (!verifyScope.trim()) {
                throw new Error('Scope is required.')
            }

            if (verifyPoints.some((point) => !point.trim())) {
                throw new Error('All proof points are required.')
            }

            const proofToVerify = {
                merkleTreeDepth: depth,
                merkleTreeRoot: verifyMerkleTreeRoot.trim(),
                nullifier: verifyNullifier.trim(),
                message: toNumericString(verifyMessage),
                scope: toNumericString(verifyScope),
                points: verifyPoints.map((point) => point.trim()) as PackedGroth16Proof
            }

            const result = await verifyProof(proofToVerify)
            setVerifyResult(result)
            setVerifyStatus('')


            if (!wallet) {
                throw new Error("Wallet not connected")
            }

            const publicInputs = [
                    BigInt(proofToVerify.merkleTreeRoot),
                    BigInt(proofToVerify.nullifier),
                    BigInt(keccakHash(proofToVerify.message)),
                    BigInt(keccakHash(proofToVerify.scope))
                ]

            const calldata = await generateCalldata(
                proofToVerify.points,
                publicInputs,
                depth
            )

            const gid = cairo.uint256(groupId);
            const merkleTreeRootUint256 = cairo.uint256(proofToVerify.merkleTreeRoot);
            const nullifierUint256 = cairo.uint256(proofToVerify.nullifier);
            const messageUint256 = cairo.uint256(keccakHash(proofToVerify.message));
            const scopeUint256 = cairo.uint256(keccakHash(proofToVerify.scope));

            const verificationStatus = await verifyProof(proofToVerify)
            console.log(verificationStatus)

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    "calls": [
                        {
                            "contract_address": SEMAPHORE_CONTRACT_ADDRESS,
                            "entry_point": "verify_proof",
                            "calldata": [
                                gid.low.toString(),
                                gid.high.toString(),
                                merkleTreeRootUint256.low.toString(),
                                merkleTreeRootUint256.high.toString(),
                                nullifierUint256.low.toString(),
                                nullifierUint256.high.toString(),
                                messageUint256.low.toString(),
                                messageUint256.high.toString(),
                                scopeUint256.low.toString(),
                                scopeUint256.high.toString(),
                                ...calldata
                            ]
                        }
                    ]
                }
            })
        } catch (err: any) {
            console.error('Proof verification failed:', err)
            setVerifyError(err.message || 'Proof verification failed')
            setVerifyStatus('')
        } finally {
            setIsVerifying(false)
        }
    }

    const updateVerifyPoint = (index: number, value: string) => {
        setVerifyPoints((prev) => {
            const next = [...prev] as PackedGroth16Proof
            next[index] = value
            return next
        })
    }

    const handleLoadVerifyJson = () => {
        if (!verifyJsonInput.trim()) {
            setVerifyError('Paste proof JSON to load.')
            return
        }

        try {
            const parsedProof = parseProofJson(verifyJsonInput.trim())
            applyProofToVerifyFields(parsedProof)
            setVerifyError(null)
            setVerifyResult(null)
        } catch (err: any) {
            setVerifyError(err.message || 'Invalid proof JSON.')
        }
    }

    const handleUseGeneratedProof = () => {
        if (!generatedProof) return
        applyProofToVerifyFields(generatedProof)
        setVerifyJsonInput('')
        setVerifyError(null)
        setVerifyResult(null)
        setVerifyStatus('')
        setActiveTab('verify')
    }

    const handleCopyGeneratedProof = async () => {
        if (!generatedProof) return

        try {
            const payload = JSON.stringify(generatedProof, null, 2)
            await navigator.clipboard.writeText(payload)
            setCopyFeedback('Copied JSON')
        } catch (err) {
            setCopyFeedback('Copy failed')
        } finally {
            setTimeout(() => setCopyFeedback(null), 2000)
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
                                        <h2 className="text-sm font-black uppercase tracking-widest">Messages Module</h2>
                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Anonymous Messaging</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors group">
                                    <X className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg">
                                <button
                                    onClick={() => {
                                        setActiveTab('send')
                                        setError(null)
                                        setTxHash(null)
                                        setStatus('')
                                        setVerifyError(null)
                                        setVerifyResult(null)
                                        setVerifyStatus('')
                                        setVerifyJsonInput('')
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'send' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <Send className="w-3 h-3" />
                                    Send message
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('verify')
                                        setError(null)
                                        setTxHash(null)
                                        setStatus('')
                                        setVerifyError(null)
                                        setVerifyResult(null)
                                        setVerifyStatus('')
                                    }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${activeTab === 'verify' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    <BadgeCheck className="w-3 h-3" />
                                    Verify Proof
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'send' ? (
                                <>
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

                                        {identityCommitment ? (
                                            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Active Identity</label>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase">Ready</span>
                                                    </div>
                                                </div>
                                                <code className="text-[10px] font-mono font-bold text-white line-clamp-1">{identityCommitment}</code>
                                            </div>
                                        ) : (
                                            <div className="p-6 border-2 border-dashed border-neutral-100 rounded-2xl text-center space-y-4">
                                                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
                                                    <Shield className="w-6 h-6 text-neutral-200" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Identity Required</h4>
                                                    <p className="text-[9px] text-neutral-300 font-bold uppercase mt-1">Generate a root identity to sign signals</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={onOpenIdentity}
                                                    className="w-full py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                                                >
                                                    Open Identity Hub
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Scope</label>
                                            <input
                                                type="text"
                                                value={scope}
                                                onChange={(e) => setScope(e.target.value)}
                                                placeholder="e.g. 101 (Voting event or context)"
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                            <p className="text-[8px] text-neutral-300 font-bold uppercase">Defines the context for nullifier uniqueness</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Message</label>
                                            <input
                                                type="text"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="e.g. Hello world or 1"
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
                                                    {status || 'Processing...'}
                                                </>
                                            ) : (
                                                'Send message'
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
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider">Message Sent</h4>
                                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">Awaiting on-chain confirmation</p>
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

                                    {generatedProof && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 p-6 bg-white border border-neutral-100 rounded-2xl space-y-5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider">Generated proof</h4>
                                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">Use these values in Verify Proof</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300">Local</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCopyGeneratedProof}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-[9px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    Copy proof JSON
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleUseGeneratedProof}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                                                >
                                                    <BadgeCheck className="w-3 h-3" />
                                                    Verify this proof
                                                </button>
                                                {copyFeedback && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{copyFeedback}</span>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Merkle Tree Depth</span>
                                                    <code className="mt-1 block text-[10px] font-mono font-bold text-neutral-700">{generatedProof.merkleTreeDepth}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Merkle Tree Root</span>
                                                    <code className="mt-1 block text-[10px] font-mono font-bold break-all text-neutral-700">{generatedProof.merkleTreeRoot}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Nullifier</span>
                                                    <code className="mt-1 block text-[10px] font-mono font-bold break-all text-neutral-700">{generatedProof.nullifier}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Message (Numeric)</span>
                                                    <code className="mt-1 block text-[10px] font-mono font-bold break-all text-neutral-700">{generatedProof.message}</code>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Scope (Numeric)</span>
                                                    <code className="mt-1 block text-[10px] font-mono font-bold break-all text-neutral-700">{generatedProof.scope}</code>
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Proof Points</span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {generatedProof.points.map((point, index) => (
                                                            <div key={`proof-point-${index}`} className="p-2 bg-neutral-50 border border-neutral-100 rounded-lg">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400">P{index + 1}</span>
                                                                <code className="mt-1 block text-[9px] font-mono font-bold break-all text-neutral-600">{point}</code>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <form onSubmit={handleVerifyProof} className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Proof JSON (Optional)</label>
                                                <div className="flex items-center gap-2">
                                                    {verifyJsonInput && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setVerifyJsonInput('')}
                                                            className="text-[8px] font-black uppercase tracking-wider text-neutral-400 hover:text-black transition-colors"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={handleLoadVerifyJson}
                                                        className="text-[8px] font-black uppercase tracking-wider text-neutral-600 hover:text-black transition-colors"
                                                    >
                                                        Load JSON
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={verifyJsonInput}
                                                onChange={(e) => setVerifyJsonInput(e.target.value)}
                                                placeholder='{"merkleTreeDepth":20,"merkleTreeRoot":"...","nullifier":"...","message":"...","scope":"...","points":[...]}'
                                                rows={5}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all resize-none"
                                            />
                                            <p className="text-[8px] text-neutral-300 font-bold uppercase">If provided, JSON takes precedence over fields.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Merkle Tree Depth</label>
                                            <input
                                                type="number"
                                                value={verifyMerkleTreeDepth}
                                                onChange={(e) => setVerifyMerkleTreeDepth(e.target.value)}
                                                placeholder="e.g. 20"
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Merkle Tree Root</label>
                                            <input
                                                type="text"
                                                value={verifyMerkleTreeRoot}
                                                onChange={(e) => setVerifyMerkleTreeRoot(e.target.value)}
                                                placeholder="e.g. 123456..."
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Nullifier</label>
                                            <input
                                                type="text"
                                                value={verifyNullifier}
                                                onChange={(e) => setVerifyNullifier(e.target.value)}
                                                placeholder="e.g. 987654..."
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Message</label>
                                            <input
                                                type="text"
                                                value={verifyMessage}
                                                onChange={(e) => setVerifyMessage(e.target.value)}
                                                placeholder="e.g. Hello or 1"
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                            <p className="text-[8px] text-neutral-300 font-bold uppercase">Text is encoded to bytes32; numbers are used as-is.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Scope</label>
                                            <input
                                                type="text"
                                                value={verifyScope}
                                                onChange={(e) => setVerifyScope(e.target.value)}
                                                placeholder="e.g. 101"
                                                required
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Proof Points</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {verifyPoints.map((point, index) => (
                                                    <input
                                                        key={`verify-point-${index}`}
                                                        type="text"
                                                        value={point}
                                                        onChange={(e) => updateVerifyPoint(index, e.target.value)}
                                                        placeholder={`P${index + 1}`}
                                                        required
                                                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] font-bold focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isVerifying}
                                            className="w-full h-12 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white hover:border-black transition-all disabled:bg-neutral-100 disabled:text-neutral-400 flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {verifyStatus || 'Verifying...'}
                                                </>
                                            ) : (
                                                'Verify Proof'
                                            )}
                                        </button>
                                    </form>

                                    {verifyError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
                                        >
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-[10px] font-black text-red-900 uppercase tracking-wider mb-1">Verification Error</h4>
                                                <p className="text-[10px] text-red-600 font-bold leading-relaxed">{verifyError}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {verifyResult !== null && !verifyError && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`mt-6 p-4 rounded-xl border ${verifyResult ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${verifyResult ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                                    {verifyResult ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider">{verifyResult ? 'Proof is valid' : 'Proof is invalid'}</h4>
                                                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight">Checked locally with semaphore verifier</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-neutral-50 border-t border-neutral-100 italic">
                            <p className="text-[9px] text-neutral-400 font-medium leading-relaxed uppercase tracking-tight">
                                Message sealing is computationally expensive and is performed entirely in your browser.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
