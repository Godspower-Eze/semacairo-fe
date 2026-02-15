import { useState, useCallback, useEffect } from 'react'
import { connect, disconnect } from 'starknetkit'
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
