import { useState, useCallback, useEffect } from 'react'
import { connect, disconnect, getSelectedConnectorWallet } from 'starknetkit'
import { AccountInterface } from 'starknet'

export const useStarknet = () => {
    const [address, setAddress] = useState<string | null>(null)
    const [account, setAccount] = useState<AccountInterface | null>(null)
    const [chainId, setChainId] = useState<string | null>(null)
    const [wallet, setWallet] = useState<any>(null)
    const [isConnecting, setIsConnecting] = useState(false)

    const connectWallet = useCallback(async () => {
        if (isConnecting) return

        setIsConnecting(true)
        try {
            const result = await connect({
                modalMode: "canAsk",
                modalTheme: "light"
            })

            setWallet(result.wallet)

            if (result.connectorData && result.connectorData.account) {
                setAddress(result.connectorData.account)
                setChainId(result.connectorData.chainId ? result.connectorData.chainId.toString() : null)
            }

            const connectedWallet = result.wallet as any
            if (connectedWallet && connectedWallet.account) {
                setAccount(connectedWallet.account)
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
            setAccount(null)
            setChainId(null)
            setWallet(null)
        } catch (error) {
            console.error('Failed to disconnect wallet:', error)
        }
    }, [])

    const signMessage = useCallback(async (typedData: any) => {
        if (!account || !wallet) throw new Error("Wallet not connected")

        // Strategy 1: Direct wallet request (Often more robust than library wrappers)
        if (wallet.request) {
            try {
                return await wallet.request({
                    type: "starknet_signTypedData",
                    params: [typedData] // SNIP-12 standard (array wrapped)
                })
            } catch (e1: any) {
                console.warn('wallet.request [typedData] failed, trying fallback...', e1)
                try {
                    return await wallet.request({
                        type: "starknet_signTypedData",
                        params: typedData // Legacy/Alternate parameter format
                    })
                } catch (e2: any) {
                    console.warn('wallet.request raw failed...', e2)
                }
            }
        }

        // Strategy 2: account.signMessage (Library wrapper)
        try {
            return await account.signMessage(typedData)
        } catch (e3: any) {
            console.error('All signMessage strategies failed:', e3)
            throw e3
        }
    }, [account, wallet])

    useEffect(() => {
        const checkConnection = async () => {
            const savedWallet = getSelectedConnectorWallet()
            if (savedWallet) {
                // Silently reconnecting would happen here
            }
        }
        checkConnection()
    }, [])

    return {
        address,
        account,
        chainId,
        signMessage,
        isConnecting,
        connectWallet,
        disconnectWallet,
        isConnected: !!address
    }
}
