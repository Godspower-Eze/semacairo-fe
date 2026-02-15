import { useState, useCallback, useEffect } from 'react'
import { connect, disconnect, getSelectedConnectorWallet } from 'starknetkit'
import type { TypedData } from 'starknet'
import type { StarknetWindowObject } from 'starknetkit'

export const useStarknet = () => {
    const [address, setAddress] = useState<string | null>(null)
    const [chainId, setChainId] = useState<string | null>(null)
    const [wallet, setWallet] = useState<StarknetWindowObject | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)

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

    useEffect(() => {
        const checkConnection = async () => {
            const savedWallet = await getSelectedConnectorWallet()
            if (savedWallet) {
                setWallet(savedWallet)
                // Cast to any to access properties that might be missing in strict type but present in object
                const walletAny = savedWallet as any
                if (walletAny.isConnected) {
                    setAddress(walletAny.account ? walletAny.account.address : null)
                    setChainId(walletAny.chainId ? "0x" + walletAny.chainId.toString(16) : null)
                }
            }
        }
        checkConnection()
    }, [])

    useEffect(() => {
        if (wallet) {
            const handleAccountsChanged = (accounts: string[] | undefined) => {
                if (accounts && accounts.length > 0) {
                    setAddress(accounts[0])
                } else {
                    setAddress(null)
                }
            }

            const handleChainChanged = (chainId: string | undefined) => {
                setChainId(chainId ? "0x" + parseInt(chainId).toString(16) : null)
            }

            try {
                // Cast to any to avoid strict type mismatch with event handlers
                (wallet as any).on('accountsChanged', handleAccountsChanged);
                (wallet as any).on('networkChanged', handleChainChanged);
            } catch (e) {
                console.error("Failed to add event listeners", e)
            }

            return () => {
                try {
                    (wallet as any).off('accountsChanged', handleAccountsChanged);
                    (wallet as any).off('networkChanged', handleChainChanged);
                } catch (e) {
                    console.error("Failed to remove event listeners", e)
                }
            }
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
        isConnected: !!address
    }
}
