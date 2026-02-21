import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, ExternalLink, Menu, X, Lock, Fingerprint, Wallet, LogOut, Users, Search, AlertTriangle, Plus, UserPlus, Loader2 } from 'lucide-react'
import React from 'react'
import { Identity } from '@semaphore-protocol/identity'
import { useStarknet } from './hooks/useStarknet'
import { IdentityDrawer } from './components/IdentityDrawer'
import { GroupsDrawer } from './components/GroupsDrawer'
import { ProofsDrawer } from './components/ProofsDrawer'
import { fetchAllGroups, type GroupInfo } from './utils/common'

function App() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState(false)
  const [isGroupsDrawerOpen, setIsGroupsDrawerOpen] = useState(false)
  const [isProofsDrawerOpen, setIsProofsDrawerOpen] = useState(false)
  
  // Initial focused states for drawers
  const [initialGroupId, setInitialGroupId] = useState<string>('')
  const [initialGroupsTab, setInitialGroupsTab] = useState<'create' | 'add'>('create')

  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  const { isConnected, address, chainId, signMessage, isConnecting, connectWallet, disconnectWallet, wallet, isSepolia, switchToSepolia } = useStarknet()

  // Fetch groups on mount and poll for updates
  React.useEffect(() => {
    let isMounted = true;

    async function loadGroups(showLoading = false) {
      if (showLoading) setIsLoadingGroups(true)
      try {
        const fetched = await fetchAllGroups()
        if (isMounted) {
          setGroups(fetched)
        }
      } catch (err) {
        console.error("Failed to fetch groups:", err)
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingGroups(false)
        }
      }
    }

    // Initial load with loading state
    loadGroups(true)

    // Poll every 10 seconds in the background
    const intervalId = setInterval(() => {
      loadGroups(false)
    }, 10000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  // Actions are only allowed when connected AND on Sepolia
  const isReady = isConnected && isSepolia

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black/5">
      {/* Network Guard Banner */}
      {isConnected && !isSepolia && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Wrong Network — Switch to Starknet Sepolia to continue</span>
            </div>
            <button
              onClick={switchToSepolia}
              className="px-4 py-1.5 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-amber-700 transition-colors"
            >
              Switch Network
            </button>
          </div>
        </div>
      )}
      {/* Identity Drawer */}
      <IdentityDrawer
        isOpen={isIdentityDrawerOpen}
        onClose={() => setIsIdentityDrawerOpen(false)}
        chainId={chainId}
        signMessage={signMessage}
        wallet={wallet}
        address={address}
        identity={identity}
        setIdentity={setIdentity}
      />

      {/* Groups Drawer */}
      <GroupsDrawer
        isOpen={isGroupsDrawerOpen}
        onClose={() => setIsGroupsDrawerOpen(false)}
        wallet={wallet}
        identity={identity}
        onOpenIdentity={() => {
          setIsGroupsDrawerOpen(false)
          setIsIdentityDrawerOpen(true)
        }}
        initialGroupId={initialGroupId}
        initialTab={initialGroupsTab}
      />

      {/* Proofs Drawer */}
      <ProofsDrawer
        isOpen={isProofsDrawerOpen}
        onClose={() => setIsProofsDrawerOpen(false)}
        wallet={wallet}
        identity={identity}
        onOpenIdentity={() => {
          setIsProofsDrawerOpen(false)
          setIsIdentityDrawerOpen(true)
        }}
        initialGroupId={initialGroupId}
      />

      {/* Navigation */}
      {/* ... (keep nav as is) */}
      <nav className="fixed top-0 w-full z-50 bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <Shield className="w-6 h-6" />
              <span className="text-lg font-bold tracking-tight uppercase">SemaCairo</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-4">
              {isConnected ? (
                <div className="flex items-center gap-3">
                  <div className="border border-neutral-200 px-4 py-2 text-xs font-mono flex items-center gap-2 bg-neutral-50 rounded-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    {truncatedAddress}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="p-2 border border-neutral-200 hover:bg-neutral-50 hover:border-black transition-all cursor-pointer rounded-sm"
                    title="Disconnect"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-black text-white px-10 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-neutral-800 hover:scale-[1.02] hover:ring-2 hover:ring-black hover:ring-offset-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xl shadow-black/20 rounded-sm group"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    {isConnecting ? 'Establishing...' : 'Connect Identity'}
                  </div>
                </button>
              )}
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 border border-neutral-100 rounded-sm"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-neutral-100 bg-white">
            <div className="px-6 py-6 flex flex-col gap-4">
              {isConnected ? (
                <>
                  <div className="border border-neutral-200 px-4 py-3 text-xs font-mono flex items-center justify-center gap-2 bg-neutral-50 rounded-sm w-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    {truncatedAddress}
                  </div>
                  <button
                    onClick={() => {
                      disconnectWallet()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-neutral-200 hover:bg-neutral-50 hover:border-black transition-all cursor-pointer rounded-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Disconnect</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    connectWallet()
                    setIsMenuOpen(false)
                  }}
                  disabled={isConnecting}
                  className="w-full bg-black text-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:bg-neutral-800 disabled:opacity-50 cursor-pointer rounded-sm group flex justify-center"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    {isConnecting ? 'Establishing...' : 'Connect Identity'}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-100 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-6">
                <div className="w-1 h-1 rounded-full bg-black" />
                Infrastructure-as-Privacy
              </div>
              <h1 className="text-6xl font-bold tracking-tighter mb-6 uppercase leading-[0.85]">Anonymous <br />Groups.</h1>
              <p className="text-xl text-neutral-400 font-medium max-w-lg leading-relaxed">
                A zero-knowledge protocol for anonymous signaling on Starknet. Prove membership without revealing identity.
              </p>
            </div>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Identity Module */}
            <section className={`group border border-neutral-100 p-10 flex flex-col hover:border-black hover:bg-neutral-50 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 relative overflow-hidden cursor-default ${!isReady ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-100/50 translate-x-16 -translate-y-16 rotate-45 transition-transform group-hover:bg-black/5 group-hover:translate-x-12 group-hover:-translate-y-12" />
              <div className="flex items-center justify-between mb-10 relative">
                <div className="p-4 bg-white border border-neutral-100 shadow-sm group-hover:border-black group-hover:rotate-3 transition-all">
                  <Fingerprint className="w-6 h-6" />
                </div>
                {!isReady && <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Locked</span>}
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200 group-hover:text-black transition-colors">ROOT_01</span>
              </div>
              <h3 className="text-2xl font-bold uppercase mb-4 tracking-tight">Identity</h3>
              <p className="text-sm text-neutral-500 mb-10 leading-relaxed font-medium">
                Generate unique cryptographic identities using your wallet signature to manage your privacy root.
              </p>
              <div className="mt-auto flex flex-col gap-3 relative">
                <button
                  onClick={() => setIsIdentityDrawerOpen(true)}
                  disabled={!isReady}
                  className="bg-black text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isConnected ? 'Manage Identity' : 'Connect Wallet to Access'}
                </button>
              </div>
            </section>

            {/* Groups Module */}
            <section className={`group border border-neutral-100 p-10 flex flex-col hover:border-black hover:bg-neutral-50 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 relative overflow-hidden cursor-default ${!isReady ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-100/50 translate-x-16 -translate-y-16 rotate-45 transition-transform group-hover:bg-black/5 group-hover:translate-x-12 group-hover:-translate-y-12" />
              <div className="flex items-center justify-between mb-10 relative">
                <div className="p-4 bg-white border border-neutral-100 shadow-sm group-hover:border-black group-hover:-rotate-3 transition-all">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200 group-hover:text-black transition-colors">NODE_02</span>
              </div>
              <h3 className="text-2xl font-bold uppercase mb-4 tracking-tight">Groups</h3>
              <p className="text-sm text-neutral-500 mb-10 leading-relaxed font-medium">
                Initialize new anonymous groups on Starknet or join existing ones to participate in private signaling.
              </p>
              <div className="mt-auto flex flex-col gap-3 relative">
                <button
                  disabled={!isReady}
                  onClick={() => setIsGroupsDrawerOpen(true)}
                  className="bg-black text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed text-center"
                >
                  Create Group
                </button>
                <button
                  disabled={!isReady}
                  onClick={() => setIsGroupsDrawerOpen(true)}
                  className="border border-neutral-200 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:border-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-center"
                >
                  Join Group
                </button>
              </div>
            </section>

            {/* Messages Module */}
            <section className={`group border border-neutral-100 p-10 flex flex-col hover:border-black hover:bg-neutral-50 hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 relative overflow-hidden cursor-default ${!isReady ? 'opacity-50' : ''}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-100/50 translate-x-16 -translate-y-16 rotate-45 transition-transform group-hover:bg-black/5 group-hover:translate-x-12 group-hover:-translate-y-12" />
              <div className="flex items-center justify-between mb-10 relative">
                <div className="p-4 bg-white border border-neutral-100 shadow-sm group-hover:border-black group-hover:rotate-6 transition-all">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200 group-hover:text-black transition-colors">MSG_03</span>
              </div>
              <h3 className="text-2xl font-bold uppercase mb-4 tracking-tight">Messages</h3>
              <p className="text-sm text-neutral-500 mb-10 leading-relaxed font-medium">
                Send anonymous messages with zero-knowledge guarantees and optionally verify the proof payload.
              </p>
              <div className="mt-auto flex flex-col gap-3 relative">
                <button
                  disabled={!isReady}
                  onClick={() => {
                    setInitialGroupId('')
                    setIsProofsDrawerOpen(true)
                  }}
                  className="bg-black text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer text-center shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Send message
                </button>
                <button
                  disabled={!isReady}
                  onClick={() => {
                    setInitialGroupId('')
                    setIsProofsDrawerOpen(true)
                  }}
                  className="border border-neutral-200 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:border-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Verify Proof
                </button>
              </div>
            </section>
          </div>

          <section className="mt-20 border-t border-neutral-100 pt-20">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">On-Chain Groups</h2>
              <button 
                disabled={!isReady}
                onClick={() => {
                  setInitialGroupId('')
                  setInitialGroupsTab('create')
                  setIsGroupsDrawerOpen(true)
                }}
                className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-4 py-2 hover:bg-neutral-800 transition-colors disabled:opacity-30 flex items-center gap-2"
              >
                <Plus className="w-3 h-3" /> Create Group
              </button>
            </div>

            {isLoadingGroups ? (
              <div className="border border-neutral-100 p-12 text-center flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-neutral-200 animate-spin" />
                <p className="text-sm text-neutral-400">Syncing with Sepolia...</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="border border-neutral-100 p-12 text-center">
                <Search className="w-8 h-8 mx-auto mb-4 text-neutral-200" />
                <p className="text-sm text-neutral-400">No active groups detected.</p>
                <p className="text-xs text-neutral-300 mt-2 italic">Connect wallet and generate identity to start.</p>
              </div>
            ) : (
              <div className="border border-neutral-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50">
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 whitespace-nowrap">Group ID</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 whitespace-nowrap">Admin</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 whitespace-nowrap">Depth</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      // is connected address the admin? (ignoring case)
                      const isGroupAdmin = isReady && address && (BigInt(address) === BigInt(group.admin));
                      const truncatedAdmin = `${group.admin.slice(0, 6)}...${group.admin.slice(-4)}`;

                      return (
                        <tr key={group.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors last:border-b-0 group">
                          <td className="p-4 align-middle">
                            <span className="font-mono text-sm font-bold">#{group.id}</span>
                          </td>
                          <td className="p-4 align-middle">
                            <span className="font-mono text-xs text-neutral-500 bg-black/5 px-2 py-1 rounded-sm">{truncatedAdmin}</span>
                            {isGroupAdmin && <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2 py-1 rounded-sm">You</span>}
                          </td>
                          <td className="p-4 align-middle">
                            <span className="text-xs text-neutral-500 font-medium">{group.depth}</span>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                disabled={!isReady || !isGroupAdmin}
                                onClick={() => {
                                  setInitialGroupId(group.id)
                                  setInitialGroupsTab('add')
                                  setIsGroupsDrawerOpen(true)
                                }}
                                title={!isGroupAdmin ? "Only the admin can add members" : "Add Member"}
                                className="p-2 border border-neutral-200 hover:border-black hover:bg-black hover:text-white transition-all rounded-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black disabled:hover:border-neutral-200"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-6 bg-neutral-100 mx-1" />
                              <button
                                disabled={!isReady}
                                onClick={() => {
                                  setInitialGroupId(group.id)
                                  setIsProofsDrawerOpen(true)
                                }}
                                className="px-3 py-1.5 border border-neutral-200 hover:border-black text-[9px] font-black uppercase tracking-wider text-black transition-all rounded-sm disabled:opacity-30"
                              >
                                Message
                              </button>
                              <button
                                disabled={!isReady}
                                onClick={() => {
                                  setInitialGroupId(group.id)
                                  setIsProofsDrawerOpen(true) // ProofsDrawer currently handles both send & verify on same initial flow
                                }}
                                className="px-3 py-1.5 border border-neutral-200 hover:border-black text-[9px] font-black uppercase tracking-wider text-black transition-all rounded-sm disabled:opacity-30"
                              >
                                Verify
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-neutral-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-black" />
            <span>SemaCairo Protocol</span>
          </div>
          <div className="flex gap-12">
            <a href="https://github.com" className="hover:text-black transition-colors flex items-center gap-1">
              Github <ExternalLink className="w-2 h-2" />
            </a>
            <a href="#" className="hover:text-black transition-colors flex items-center gap-1">
              Starknet <ExternalLink className="w-2 h-2" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
