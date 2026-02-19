import { useState, useCallback, useEffect } from 'react'
import { connect, disconnect } from 'starknetkit'
import type { TypedData } from 'starknet'
import type { StarknetWindowObject } from 'starknetkit'

// Starknet Sepolia chain ID in hex
const SEPOLIA_CHAIN_ID = '0x534e5f5345504f4c4941'

export const useStarknet = () => {
    const [address, setAddress] = useState<string | null>(null)
    const [chainId, setChainId] = useState<string | null>(null)
    const [wallet, setWallet] = useState<StarknetWindowObject | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)

    const isSepolia = chainId === SEPOLIA_CHAIN_ID

    const connectWallet = useCallback(async () => {
        if (isConnecting) return

        setIsConnecting(true)
        try {
            const result = await connect({
                modalMode: "canAsk",
                modalTheme: "dark"
            })

            setWallet(result.wallet ?? null)

            if (result.connectorData && result.connectorData.account) {
                setAddress(result.connectorData.account)
                setChainId(result.connectorData.chainId ? "0x" + result.connectorData.chainId.toString(16) : null)
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error)
        } finally {
            setIsConnecting(false)
        }
    }, [isConnecting])

    const disconnectWallet = useCallback(async () => {
        try {
            await disconnect({ clearLastWallet: true })
            setAddress(null)
            setChainId(null)
            setWallet(null)
        } catch (error) {
            console.error('Failed to disconnect wallet:', error)
        }
    }, [])

    const signMessage = useCallback(async (typedData: TypedData) => {
        if (!wallet) throw new Error("Wallet not connected")
        const signature = await wallet.request({ type: "wallet_signTypedData", params: typedData })
        return signature
    }, [wallet])

    // Listen for wallet network and account changes
    useEffect(() => {
        if (!wallet) return

        const handleNetworkChanged = (newChainId?: string) => {
            if (newChainId) {
                // Wallet may provide hex-prefixed or raw chain ID
                const formatted = newChainId.startsWith('0x') ? newChainId : '0x' + newChainId
                setChainId(formatted)
            }
        }

        const handleAccountsChanged = (accounts?: string[]) => {
            if (accounts && accounts.length > 0) {
                setAddress(accounts[0])
            } else {
                // Account disconnected from wallet side
                setAddress(null)
                setChainId(null)
                setWallet(null)
            }
        }

        wallet.on('networkChanged' as any, handleNetworkChanged as any)
        wallet.on('accountsChanged' as any, handleAccountsChanged as any)

        return () => {
            wallet.off('networkChanged' as any, handleNetworkChanged as any)
            wallet.off('accountsChanged' as any, handleAccountsChanged as any)
        }
    }, [wallet])

    const switchToSepolia = useCallback(async () => {
        if (!wallet) return
        try {
            await wallet.request({
                type: 'wallet_switchStarknetChain' as any,
                params: { chainId: SEPOLIA_CHAIN_ID }
            })
            setChainId(SEPOLIA_CHAIN_ID)
        } catch (error) {
            console.error('Failed to switch network:', error)
        }
    }, [wallet])

    return {
        address,
        wallet,
        chainId,
        signMessage,
        isConnecting,
        connectWallet,
        disconnectWallet,
        isConnected: !!address,
        isSepolia,
        switchToSepolia
    }
}

