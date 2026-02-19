import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, ExternalLink, Menu, X, Lock, Fingerprint, Wallet, LogOut, Users, Search, AlertTriangle } from 'lucide-react'
import { Identity } from '@semaphore-protocol/identity'
import { useStarknet } from './hooks/useStarknet'
import { IdentityDrawer } from './components/IdentityDrawer'
import { GroupsDrawer } from './components/GroupsDrawer'
import { ProofsDrawer } from './components/ProofsDrawer'

function App() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState(false)
  const [isGroupsDrawerOpen, setIsGroupsDrawerOpen] = useState(false)
  const [isProofsDrawerOpen, setIsProofsDrawerOpen] = useState(false)
  const { isConnected, address, chainId, signMessage, isConnecting, connectWallet, disconnectWallet, wallet, isSepolia, switchToSepolia } = useStarknet()

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
                  onClick={() => setIsProofsDrawerOpen(true)}
                  className="bg-black text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors cursor-pointer text-center shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Send message
                </button>
                <button
                  disabled={!isReady}
                  onClick={() => setIsProofsDrawerOpen(true)}
                  className="border border-neutral-200 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:border-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Verify Proof
                </button>
              </div>
            </section>
          </div>

          <section className="mt-20 border-t border-neutral-100 pt-20">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 mb-10">Active Operations</h2>
            <div className="border border-neutral-100 p-12 text-center">
              <Search className="w-8 h-8 mx-auto mb-4 text-neutral-200" />
              <p className="text-sm text-neutral-400">No active signals or group memberships detected.</p>
              <p className="text-xs text-neutral-300 mt-2 italic">Connect wallet and generate identity to start.</p>
            </div>
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
