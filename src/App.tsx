import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, ExternalLink, Menu, X, Lock, Fingerprint, LogOut, Users, Search, AlertTriangle, Plus, UserPlus, Loader2, Heart } from 'lucide-react'
import { Identity } from '@semaphore-protocol/identity'
import { useStarknet } from './hooks/useStarknet'
import { IdentityDrawer } from './components/IdentityDrawer'
import { GroupsDrawer } from './components/GroupsDrawer'
import { ProofsDrawer } from './components/ProofsDrawer'
import { fetchAllGroups, type GroupInfo } from './utils/common'

import { Button } from './components/ui/Button'
import { Card, CardContent } from './components/ui/Card'
import { HashDisplay } from './components/ui/HashDisplay'

function App() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState(false)
  const [isGroupsDrawerOpen, setIsGroupsDrawerOpen] = useState(false)
  const [isProofsDrawerOpen, setIsProofsDrawerOpen] = useState(false)
  
  // Initial focused states for drawers
  const [initialGroupId, setInitialGroupId] = useState<string>('')
  const [initialGroupsTab, setInitialGroupsTab] = useState<'create' | 'add'>('create')
  const [initialProofsTab, setInitialProofsTab] = useState<'send' | 'verify'>('send')

  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)

  const { isConnected, address, chainId, signMessage, isConnecting, connectWallet, disconnectWallet, wallet, isSepolia, switchToSepolia } = useStarknet()

  // Fetch groups on mount and poll for updates
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      {/* Network Guard Banner */}
      {isConnected && !isSepolia && (
        <Card variant="danger" className="fixed top-0 left-0 right-0 z-[100] border-t-0 border-x-0 rounded-none bg-red-950/20">
          <CardContent className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between !p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">CRITICAL VERIFICATION OMITTED — Switch to Starknet Sepolia</span>
            </div>
            <Button variant="danger" onClick={switchToSepolia} className="!py-2">
              Force Network Switch
            </Button>
          </CardContent>
        </Card>
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
        initialTab={initialProofsTab}
      />

      {/* Navigation */}
      <nav className={`fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 ${isConnected && !isSepolia ? 'top-16' : 'top-0'}`}>
        <div className="max-w-[90rem] mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4"
            >
              <Shield className="w-5 h-5" />
              <span className="text-sm font-black tracking-widest uppercase text-[var(--color-text)]">SEMACAIRO</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-4">
              {isConnected && address ? (
                <div className="flex items-center gap-3">
                  <HashDisplay hash={address} title="Wallet Address" />
                  <Button
                    variant="ghost"
                    onClick={disconnectWallet}
                    title="Disconnect"
                    className="!px-3 !py-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={connectWallet}
                  isLoading={isConnecting}
                >
                  CONNECT WALLET
                </Button>
              )}
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="!px-3 !py-2"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]">
            <div className="px-6 py-6 flex flex-col gap-4">
              {isConnected && address ? (
                <>
                  <HashDisplay hash={address} className="w-full justify-center" />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      disconnectWallet()
                      setIsMenuOpen(false)
                    }}
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    LOG OUT
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    connectWallet()
                    setIsMenuOpen(false)
                  }}
                  isLoading={isConnecting}
                  className="w-full"
                >
                  CONNECT WALLET
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="pt-40 pb-20 px-6">
        <div className="max-w-[90rem] mx-auto">
          <header className="mb-32 flex flex-col md:flex-row justify-between gap-12">
            <div className="max-w-4xl">
              <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-tighter mb-8 uppercase leading-[0.85] text-[var(--color-text)]">
                SEMACAIRO
              </h1>
              <p className="text-xl md:text-2xl text-[var(--color-text-muted)] font-medium max-w-2xl leading-relaxed tracking-tight">
                Prove your membership. Broadcast anonymously. A zero-knowledge protocol for private identities, cryptographic groups, and trustless messaging. Built on Starknet.
              </p>
            </div>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Identity Module */}
            <Card variant="default" className={`group flex flex-col min-h-[320px] cursor-default transition-colors hover:bg-[var(--color-surface-1)] ${!isReady ? 'opacity-50' : ''}`}>
              <CardContent className="flex-1 flex flex-col justify-between p-8">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[var(--color-text)]">Identity</h3>
                  <Fingerprint className="w-12 h-12 mb-6 block text-[var(--color-text)]" />
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-medium">
                    Create and manage your zero-knowledge Identity. Your identity is your private key to participating in groups and sending messages.
                  </p>
                </div>
                <div className="mt-8 flex justify-end items-center border-t border-[var(--color-border-subtle)] pt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setIsIdentityDrawerOpen(true)}
                    disabled={!isReady}
                  >
                    IDENTIFY &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Groups Module */}
            <Card variant="default" className={`group flex flex-col min-h-[320px] cursor-default transition-colors hover:bg-[var(--color-surface-1)] ${!isReady ? 'opacity-50' : ''}`}>
              <CardContent className="flex-1 flex flex-col justify-between p-8">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[var(--color-text)]">Groups</h3>
                  <Users className="w-12 h-12 mb-6 block text-[var(--color-text)]" />
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-medium">
                    Join or create cryptographic groups. Membership in a group allows you to send anonymous, verifiable messages.
                  </p>
                </div>
                <div className="mt-8 flex justify-end items-center border-t border-[var(--color-border-subtle)] pt-6">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={!isReady}
                      onClick={() => {
                        setInitialGroupId('')
                        setInitialGroupsTab('add')
                        setIsGroupsDrawerOpen(true)
                      }}
                      className="border border-[var(--color-border-subtle)]"
                    >
                      JOIN
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!isReady}
                      onClick={() => setIsGroupsDrawerOpen(true)}
                    >
                      MANAGE &rarr;
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages Module */}
            <Card variant="default" className={`group flex flex-col min-h-[320px] cursor-default transition-colors hover:bg-[var(--color-surface-1)] ${!isReady ? 'opacity-50' : ''}`}>
              <CardContent className="flex-1 flex flex-col justify-between p-8">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-[var(--color-text)]">Messages</h3>
                  <div className="flex gap-2 mb-6 text-[var(--color-text)] font-mono text-xl font-bold border border-[var(--color-text)] p-2 w-max items-center">
                    <Lock className="w-5 h-5 mr-1 text-[var(--color-text)]"/> ZK
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-medium">
                    Broadcast anonymous messages to on-chain groups. Verify proofs from other members.
                  </p>
                </div>
                <div className="mt-8 flex justify-end items-center border-t border-[var(--color-border-subtle)] pt-6">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      disabled={!isReady}
                      onClick={() => {
                        setInitialGroupId('')
                        setInitialProofsTab('verify')
                        setIsProofsDrawerOpen(true)
                      }}
                      className="border border-[var(--color-border-subtle)]"
                    >
                      VERIFY
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!isReady}
                      onClick={() => {
                        setInitialGroupId('')
                        setInitialProofsTab('send')
                        setIsProofsDrawerOpen(true)
                      }}
                    >
                      MESSAGE &rarr;
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="mt-32">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight text-[var(--color-text)]">On-chain Groups</h2>
              <Button 
                variant="primary"
                disabled={!isReady}
                onClick={() => {
                  setInitialGroupId('')
                  setInitialGroupsTab('create')
                  setIsGroupsDrawerOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> INITIALIZE SET
              </Button>
            </div>

            <Card variant="default" className="rounded-none border-x-0 border-t-2 border-t-[var(--color-text)] bg-[var(--color-surface-0)]">
              {isLoadingGroups ? (
                <div className="p-24 text-center flex flex-col items-center justify-center gap-6">
                  <Loader2 className="w-10 h-10 text-[var(--color-text)] animate-spin" />
                  <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)]">SYNCING STATE WITH STARKNET...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="p-24 text-center border-b border-[var(--color-border-subtle)]">
                  <Search className="w-10 h-10 mx-auto mb-6 text-[var(--color-text-muted)] opacity-50" />
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">NO ACTIVE GROUPS LOCATED.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] text-[10px] tracking-widest text-[var(--color-text-muted)]">
                        <th className="p-6 font-normal uppercase">Group ID</th>
                        <th className="p-6 font-normal uppercase">Administrator</th>
                        <th className="p-6 font-normal uppercase">Depth</th>
                        <th className="p-6 font-normal uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => {
                        const isGroupAdmin = isReady && address && (BigInt(address) === BigInt(group.admin));
                        return (
                          <tr key={group.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-1)] transition-colors last:border-b-0 text-[var(--color-text)]">
                            <td className="p-6 align-middle font-bold text-sm">
                              {group.id}
                            </td>
                            <td className="p-6 align-middle">
                              <div className="flex items-center gap-3">
                                <HashDisplay hash={group.admin} />
                                {isGroupAdmin && <span className="text-[9px] font-sans font-black uppercase tracking-wider bg-[var(--color-text)] text-[var(--color-surface-0)] px-2 py-1">YOU</span>}
                              </div>
                            </td>
                            <td className="p-6 align-middle text-[var(--color-text-muted)]">
                              {group.depth}
                            </td>
                            <td className="p-6 align-middle text-right">
                              <div className="flex items-center justify-end gap-3 font-sans">
                                <Button
                                  variant="ghost"
                                  disabled={!isReady || !isGroupAdmin}
                                  onClick={() => {
                                    setInitialGroupId(group.id)
                                    setInitialGroupsTab('add')
                                    setIsGroupsDrawerOpen(true)
                                  }}
                                  title={!isGroupAdmin ? "Insufficient Permissions" : "Add Member"}
                                  className="!px-3 !py-2 border border-[var(--color-border-subtle)] disabled:border-transparent"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  disabled={!isReady}
                                  onClick={() => {
                                    setInitialGroupId(group.id)
                                    setIsProofsDrawerOpen(true)
                                  }}
                                  className="!py-2"
                                >
                                  BROADCAST
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-subtle)] py-12 px-6 mt-20 bg-[var(--color-surface-0)]">
        <div className="max-w-[90rem] mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4" />
            <span>SemaCairo Protocol Core</span>
          </div>
          <div className="flex items-center gap-12 font-mono">
            <span className="flex items-center gap-2">
              MADE WITH <Heart className="w-3 h-3 text-red-500 fill-red-500" /> BY GODSPOWER
            </span>
            <a href="https://godspowereze.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2 lowercase italic">
              godspowereze.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

