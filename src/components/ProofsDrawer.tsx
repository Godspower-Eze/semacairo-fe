import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink, Shield, Send, BadgeCheck, Copy, Database, Network } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { StarknetWindowObject } from 'starknetkit'
import { Identity } from '@semaphore-protocol/identity'
import { Group } from '@semaphore-protocol/group'
import { generateProof, verifyProof } from '@semaphore-protocol/proof'
import { type PackedGroth16Proof } from '@zk-kit/utils'
import { cairo } from 'starknet'

import { keccakHash, normalizePackedProof, toNumericString, getGroupDepth, fetchGroupMembers, generateCalldata, isNullifierUsed } from '../utils/common';
import { SEMACAIRO_CONTRACT_ADDRESS, provider } from '../config/constants';
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { HashDisplay } from './ui/HashDisplay'

interface ProofsDrawerProps {
    isOpen: boolean
    onClose: () => void
    wallet: StarknetWindowObject | null
    identity: Identity | null
    onOpenIdentity: () => void
    initialGroupId?: string
    initialTab?: 'send' | 'verify'
}

type GeneratedProof = {
    groupId?: string
    merkleTreeDepth: number
    merkleTreeRoot: string
    nullifier: string
    message: string
    scope: string
    points: PackedGroth16Proof
}

const createEmptyPackedProof = (): PackedGroth16Proof => ['', '', '', '', '', '', '', '']

export const ProofsDrawer = ({ isOpen, onClose, wallet, identity, onOpenIdentity, initialGroupId, initialTab = 'send' }: ProofsDrawerProps) => {
    const [activeTab, setActiveTab] = useState<'send' | 'verify'>(initialTab)
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
    const [isOnChainVerifying, setIsOnChainVerifying] = useState(false)
    const [onChainVerifyResult, setOnChainVerifyResult] = useState<boolean | null>(null)

    // Form states
    const [groupId, setGroupId] = useState(initialGroupId || '')
    const [message, setMessage] = useState('')
    const [scope, setScope] = useState('0') // Set default scope to 0

    // Reset state when drawer opens with new props
    useEffect(() => {
        if (isOpen) {
            setGroupId(initialGroupId || '')
            setVerifyGroupId(initialGroupId || '')
            setActiveTab(initialTab) 
            setError(null)
            setTxHash(null)
            setStatus('')
            setVerifyError(null)
            setVerifyStatus('')
            setVerifyResult(null)
            setOnChainVerifyResult(null)
            setIsOnChainVerifying(false)
            setGeneratedProof(null)
            setVerifyJsonInput('')
        }
    }, [isOpen, initialGroupId])
    
    const [verifyMerkleTreeDepth, setVerifyMerkleTreeDepth] = useState('20')
    const [verifyMerkleTreeRoot, setVerifyMerkleTreeRoot] = useState('')
    const [verifyNullifier, setVerifyNullifier] = useState('')
    const [verifyMessage, setVerifyMessage] = useState('')
    const [verifyScope, setVerifyScope] = useState('')
    const [verifyPoints, setVerifyPoints] = useState<PackedGroth16Proof>(createEmptyPackedProof)
    const [verifyJsonInput, setVerifyJsonInput] = useState('')
    const [verifyGroupId, setVerifyGroupId] = useState(initialGroupId || '')

    // Derive commitment for UI feedback
    const identityCommitment = identity
        ? "0x" + identity.commitment.toString(16)
        : null

    const handleGenerateProof = async (e: FormEvent) => {
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
            ]

            const calldata = await generateCalldata(
                fullProof.points,
                publicInputs,
                depth
            )

            const generatedProofWithGroupId = { ...fullProof, groupId }
            setGeneratedProof(generatedProofWithGroupId)
            setStatus('Checking nullifier status on-chain...')

            // 2. Check if nullifier is already used
            const isUsed = await isNullifierUsed(fullProof.nullifier)
            if (isUsed) {
                throw new Error("You have already sent a message in this scope (nullifier already used).")
            }

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
                            "contract_address": SEMACAIRO_CONTRACT_ADDRESS,
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

        } catch (err: unknown) {
            console.error('Message send failed:', err)
            setError((err as Error).message || 'Message send failed')
            setStatus('')
        } finally {
            setIsLoading(false)
        }
    }

    const parseProofJson = (input: string): GeneratedProof => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any

        try {
            parsed = JSON.parse(input)
        } catch {
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
            ...(parsed?.groupId && { groupId: String(parsed.groupId) }),
            merkleTreeDepth,
            merkleTreeRoot: String(parsed.merkleTreeRoot),
            nullifier: String(parsed.nullifier),
            message: toNumericString(String(parsed.message)),
            scope: toNumericString(String(parsed.scope)),
            points
        }
    }

    const applyProofToVerifyFields = (proof: GeneratedProof) => {
        if (proof.groupId) setVerifyGroupId(proof.groupId)
        setVerifyMerkleTreeDepth(String(proof.merkleTreeDepth))
        setVerifyMerkleTreeRoot(proof.merkleTreeRoot)
        setVerifyNullifier(proof.nullifier)
        setVerifyMessage(proof.message)
        setVerifyScope(proof.scope)
        setVerifyPoints([...proof.points] as PackedGroth16Proof)
    }

    const executeOnChainVerification = async (proofToVerify: Omit<GeneratedProof, 'groupId'>, depth: number) => {
        setIsOnChainVerifying(true)
        setVerifyStatus('Checking on-chain status...')
        
        try {
            if (!wallet) throw new Error("Wallet not connected")

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

            const gid = cairo.uint256(verifyGroupId);
            const merkleTreeRootUint256 = cairo.uint256(proofToVerify.merkleTreeRoot);
            const nullifierUint256 = cairo.uint256(proofToVerify.nullifier);
            const messageUint256 = cairo.uint256(keccakHash(proofToVerify.message));
            const scopeUint256 = cairo.uint256(keccakHash(proofToVerify.scope));

            const response = await wallet.request({
                type: 'wallet_addInvokeTransaction',
                params: {
                    calls: [{
                        contract_address: SEMACAIRO_CONTRACT_ADDRESS,
                        entry_point: "verify_proof",
                        calldata: [
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
                    }]
                }
            })

            setTxHash(response.transaction_hash)
            setVerifyStatus('Waiting for transaction to be accepted on L2...')
            
            const receipt = await provider.waitForTransaction(response.transaction_hash)
            
            if (receipt.isSuccess()) {
                setOnChainVerifyResult(true)
                setVerifyStatus('')
            } else {
                setOnChainVerifyResult(false)
                setVerifyStatus('')
            }
        } catch (err: unknown) {
            console.error('On-chain verification failed:', err)
            setOnChainVerifyResult(false)
            setVerifyStatus('')
        } finally {
            setIsOnChainVerifying(false)
        }
    }

    const handleVerifyProof = async (e: FormEvent) => {
        e.preventDefault()
        setIsVerifying(true)
        setVerifyError(null)
        setVerifyResult(null)
        setOnChainVerifyResult(null)
        setIsOnChainVerifying(false)
        setTxHash(null) // Clear previous txHash
        setVerifyStatus('Validating proof locally...')

        try {
            const jsonInput = verifyJsonInput.trim()
            let depth = Number(verifyMerkleTreeDepth)
            let proofToVerify: Omit<GeneratedProof, 'groupId'> | null = null

            if (jsonInput) {
                const parsedProof = parseProofJson(jsonInput)
                applyProofToVerifyFields(parsedProof)
                proofToVerify = parsedProof
                depth = parsedProof.merkleTreeDepth
            } else {
                if (!Number.isFinite(depth)) {
                    throw new Error('Merkle tree depth must be a number.')
                }

                if (!verifyMerkleTreeRoot.trim()) throw new Error('Merkle tree root is required.')
                if (!verifyNullifier.trim()) throw new Error('Nullifier is required.')
                if (!verifyMessage.trim()) throw new Error('Message is required.')
                if (!verifyScope.trim()) throw new Error('Scope is required.')
                if (verifyPoints.some((point) => !point.trim())) throw new Error('All proof points are required.')

                proofToVerify = {
                    merkleTreeDepth: depth,
                    merkleTreeRoot: verifyMerkleTreeRoot.trim(),
                    nullifier: verifyNullifier.trim(),
                    message: toNumericString(verifyMessage),
                    scope: toNumericString(verifyScope),
                    points: verifyPoints.map((point) => point.trim()) as PackedGroth16Proof
                }
            }

            const result = await verifyProof(proofToVerify)
            setVerifyResult(result)
            
            if (result) {
                await executeOnChainVerification(proofToVerify, depth)
            } else {
                setVerifyStatus('')
            }

        } catch (err: unknown) {
            console.error('Proof verification failed:', err)
            setVerifyError((err as Error).message || 'Proof verification failed')
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
        } catch (err: unknown) {
            setVerifyError((err as Error).message || 'Invalid proof JSON.')
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
            setCopyFeedback('COPIED')
        } catch {
            setCopyFeedback('COPY FAILED')
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--color-surface-0)] border-l border-[var(--color-border-subtle)] z-[70] shadow-2xl overflow-hidden flex flex-col text-[var(--color-text)]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[var(--color-text)] flex items-center justify-center">
                                        <Database className="w-6 h-6 text-[var(--color-surface-0)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-widest text-[var(--color-text)]">SEMACAIRO</h2>
                                        <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-widest">Anonymous Signaling</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-2)] transition-colors group">
                                    <X className="w-6 h-6 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-4">
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
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest border transition-all ${activeTab === 'send' ? 'bg-[var(--color-text)] text-[var(--color-surface-0)] border-[var(--color-text)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'
                                        }`}
                                >
                                    <Send className="w-4 h-4" />
                                    Broadcast
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
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest border transition-all ${activeTab === 'verify' ? 'bg-[var(--color-text)] text-[var(--color-surface-0)] border-[var(--color-text)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'
                                        }`}
                                >
                                    <BadgeCheck className="w-4 h-4" />
                                    Verify
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--color-surface-0)]">
                            {activeTab === 'send' ? (
                                <>
                                    <form onSubmit={handleGenerateProof} className="space-y-8">
                                        <div className="space-y-4">
                                            <Label>TARGET GROUP ID (ON-CHAIN)</Label>
                                            <Input
                                                type="number"
                                                value={groupId}
                                                onChange={(e) => setGroupId(e.target.value)}
                                                placeholder="e.g. 42"
                                                required
                                            />
                                        </div>

                                        {identityCommitment ? (
                                            <div className="p-4 bg-neutral-950 border border-neutral-800">
                                                <div className="flex items-center justify-between mb-4">
                                                    <Label className="!mb-0 text-emerald-500">ACTIVE IDENTITY SOURCE</Label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 animate-pulse" />
                                                        <span className="text-xs font-mono text-emerald-500 uppercase">Synchronized</span>
                                                    </div>
                                                </div>
                                                <HashDisplay hash={identityCommitment} />
                                            </div>
                                        ) : (
                                            <div className="p-8 border border-neutral-800 bg-neutral-950 text-center space-y-6">
                                                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto">
                                                    <Shield className="w-8 h-8 text-neutral-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-white mb-2">CRYPTOGRAPHIC IDENTITY REQUIRED</h4>
                                                    <p className="text-xs text-neutral-500 font-mono uppercase">A root identity is required to generate zero-knowledge proofs.</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={onOpenIdentity}
                                                    variant="ghost"
                                                    className="w-full border border-neutral-800"
                                                >
                                                    INITIALIZE IDENTITY
                                                </Button>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <Label>NULLIFIER SCOPE (UNIQUE IDENTIFIER)</Label>
                                            <Input
                                                type="text"
                                                value={scope}
                                                onChange={(e) => setScope(e.target.value)}
                                                placeholder="e.g. VOTE_PROPOSAL_1"
                                                required
                                            />
                                            <p className="text-[10px] text-neutral-500 font-mono uppercase leading-relaxed">Defines the context for nullifier uniqueness. Sending another message within the same scope will fail.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Label>MESSAGE PAYLOAD</Label>
                                            <Input
                                                type="text"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="e.g. YES"
                                                required
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isLoading || !wallet || !identity}
                                            isLoading={isLoading}
                                            className="w-full"
                                        >
                                            GENERATE PROOF & BROADCAST
                                        </Button>
                                    </form>

                                    {/* Sending Status Feedback */}
                                    {isLoading && status && (
                                        <div className="mt-6 flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            <p className="text-xs font-mono text-neutral-400 uppercase">{status}</p>
                                        </div>
                                    )}

                                    {/* Status Feedback */}
                                    {error && (
                                        <div className="mt-8 p-4 bg-red-950/30 border border-red-900/50">
                                            <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                SYSTEM ERROR
                                            </h4>
                                            <p className="text-xs font-mono text-red-400/80 leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    {txHash && (
                                        <div className="mt-8 p-6 bg-emerald-950/20 border border-emerald-900/30">
                                            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                TRANSACTION BROADCASTED
                                            </h4>
                                            <Label className="!text-emerald-500/70">TRANSACTION HASH</Label>
                                            <HashDisplay hash={txHash} className="mt-2 !bg-black !text-emerald-400 !border-emerald-900/50" />
                                            <a
                                                href={`https://sepolia.voyager.online/tx/${txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 text-xs font-black uppercase tracking-widest hover:bg-emerald-900/40 transition-colors"
                                            >
                                                EXPLORE ON VOYAGER
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    )}

                                    {generatedProof && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-8 p-6 bg-neutral-950 border border-neutral-800 space-y-6"
                                        >
                                            <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-white">GENERATED PROOF</h4>
                                                    <p className="text-xs text-neutral-500 font-mono uppercase mt-1">Local computation successful</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {copyFeedback && (
                                                        <span className="text-xs font-mono text-emerald-500 uppercase">{copyFeedback}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyGeneratedProof}
                                                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors"
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <Label className="!text-neutral-500">TREE DEPTH</Label>
                                                        <div className="mt-2 text-sm font-mono text-white">{generatedProof.merkleTreeDepth}</div>
                                                    </div>
                                                    <div>
                                                        <Label className="!text-neutral-500">GROUP ID</Label>
                                                        <div className="mt-2 text-sm font-mono text-white">{generatedProof.groupId}</div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <Label className="!text-neutral-500">MERKLE ROOT</Label>
                                                    <HashDisplay hash={generatedProof.merkleTreeRoot} className="mt-2 !bg-black" />
                                                </div>
                                                <div>
                                                    <Label className="!text-neutral-500">NULLIFIER</Label>
                                                    <HashDisplay hash={generatedProof.nullifier} className="mt-2 !bg-black" />
                                                </div>
                                                <div>
                                                    <Label className="!text-neutral-500">MESSAGE (NUMERIC)</Label>
                                                    <HashDisplay hash={generatedProof.message} className="mt-2 !bg-black" />
                                                </div>
                                                <div>
                                                    <Label className="!text-neutral-500">SCOPE (NUMERIC)</Label>
                                                    <HashDisplay hash={generatedProof.scope} className="mt-2 !bg-black" />
                                                </div>
                                                
                                                <div>
                                                    <Label className="!text-neutral-500 mb-2">PROOF POINTS [8]</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {generatedProof.points.map((p, i) => (
                                                            <div key={i} className="bg-black p-3 border border-neutral-900 overflow-hidden">
                                                                <div className="text-[10px] font-mono text-neutral-600 mb-1">P{i+1}</div>
                                                                <div className="text-[10px] font-mono text-white truncate">{p}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={handleUseGeneratedProof}
                                                variant="secondary"
                                                className="w-full mt-4"
                                            >
                                                LOAD INTO VERIFIER
                                            </Button>
                                        </motion.div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <form onSubmit={handleVerifyProof} className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label>PROOF PAYLOAD (JSON)</Label>
                                                <div className="flex items-center gap-4">
                                                    {verifyJsonInput && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setVerifyJsonInput('')}
                                                            className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                                                        >
                                                            CLEAR
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={handleLoadVerifyJson}
                                                        className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                                                    >
                                                        PARSE PAYLOAD
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={verifyJsonInput}
                                                onChange={(e) => setVerifyJsonInput(e.target.value)}
                                                placeholder='{"merkleTreeDepth": 20, "merkleTreeRoot": "...", ...}'
                                                rows={5}
                                                className="w-full p-4 bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-xs focus:outline-none focus:border-white transition-colors resize-none placeholder:text-neutral-800"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <Label>TARGET GROUP ID</Label>
                                                <Input
                                                    type="number"
                                                    value={verifyGroupId}
                                                    onChange={(e) => setVerifyGroupId(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <Label>TREE DEPTH</Label>
                                                <Input
                                                    type="number"
                                                    value={verifyMerkleTreeDepth}
                                                    onChange={(e) => setVerifyMerkleTreeDepth(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Label>MERKLE TREE ROOT</Label>
                                            <Input
                                                type="text"
                                                value={verifyMerkleTreeRoot}
                                                onChange={(e) => setVerifyMerkleTreeRoot(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label>NULLIFIER HASH</Label>
                                            <Input
                                                type="text"
                                                value={verifyNullifier}
                                                onChange={(e) => setVerifyNullifier(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label>MESSAGE PAYLOAD</Label>
                                            <Input
                                                type="text"
                                                value={verifyMessage}
                                                onChange={(e) => setVerifyMessage(e.target.value)}
                                                required
                                            />
                                            <p className="text-[10px] text-neutral-500 font-mono uppercase">Text is encoded to bytes32; numbers are evaluated literally.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Label>NULLIFIER SCOPE</Label>
                                            <Input
                                                type="text"
                                                value={verifyScope}
                                                onChange={(e) => setVerifyScope(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <Label>CRYPTOGRAPHIC PROOF POINTS</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {verifyPoints.map((point, index) => (
                                                    <Input
                                                        key={`verify-point-${index}`}
                                                        type="text"
                                                        value={point}
                                                        onChange={(e) => updateVerifyPoint(index, e.target.value)}
                                                        placeholder={`P${index + 1}`}
                                                        required
                                                        className="font-mono text-[10px] h-10"
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isVerifying}
                                            isLoading={isVerifying}
                                            className="w-full"
                                        >
                                            EXECUTE L2 VERIFICATION
                                        </Button>
                                    </form>

                                    {/* Verification Status Feedback */}
                                    {isVerifying && verifyStatus && (
                                        <div className="mt-6 flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            <p className="text-xs font-mono text-neutral-400 uppercase">{verifyStatus}</p>
                                        </div>
                                    )}

                                    {verifyError && (
                                        <div className="mt-8 p-4 bg-red-950/30 border border-red-900/50">
                                            <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                VERIFICATION ERROR
                                            </h4>
                                            <p className="text-xs font-mono text-red-400/80 leading-relaxed">{verifyError}</p>
                                        </div>
                                    )}

                                    {verifyResult !== null && !verifyError && (
                                        <div className="mt-8 space-y-4">
                                            {/* Local Verification Result */}
                                            <div className={`p-4 border ${verifyResult ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                                                <h4 className={`text-xs font-black uppercase tracking-widest flex items-center justify-between ${verifyResult ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    <span className="flex items-center gap-2">
                                                        <Network className="w-4 h-4" />
                                                        LOCAL NODE VERIFICATION
                                                    </span>
                                                    <span>{verifyResult ? 'PASSED' : 'FAILED'}</span>
                                                </h4>
                                            </div>

                                            {/* On-Chain Verify Loading */}
                                            {isOnChainVerifying && verifyStatus && (
                                                <div className="p-4 bg-blue-950/20 border border-blue-900/50 flex flex-col justify-center">
                                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500 mb-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        STARKNET L2 VERIFICATION
                                                    </h4>
                                                    <span className="text-xs font-mono text-blue-400/80 pl-6">{verifyStatus}</span>
                                                </div>
                                            )}

                                            {/* On-Chain Result */}
                                            {onChainVerifyResult !== null && (
                                                <div className={`p-4 border ${onChainVerifyResult ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
                                                    <h4 className={`text-xs font-black uppercase tracking-widest flex items-center justify-between ${onChainVerifyResult ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        <span className="flex items-center gap-2">
                                                            <Database className="w-4 h-4" />
                                                            STARKNET L2 VERIFICATION
                                                        </span>
                                                        <span>{onChainVerifyResult ? 'PASSED' : 'FAILED'}</span>
                                                    </h4>
                                                </div>
                                            )}
                                            
                                            {/* Transaction Hash */}
                                            {txHash && (
                                                <div className="p-4 bg-neutral-950 border border-neutral-900 mt-6">
                                                    <Label className="!text-neutral-500 mb-2">VERIFICATION TRANSACTION HASH</Label>
                                                    <HashDisplay hash={txHash} className="!bg-black" />
                                                    <a
                                                        href={`https://sepolia.voyager.online/tx/${txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs font-black uppercase tracking-widest"
                                                    >
                                                        VIEW VERIFICATION TX
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-neutral-950 border-t border-neutral-900">
                            <p className="text-[10px] text-neutral-600 font-mono uppercase leading-relaxed text-center">
                                Message sealing & ZK-proof generation are computationally expensive operations performed entirely client-side.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
