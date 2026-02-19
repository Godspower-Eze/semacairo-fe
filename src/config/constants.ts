import SEMAPHORE_CONTRACT_JSON from '../semacairo_Semaphore.contract_class.json'; 

import { RpcProvider } from 'starknet'

export const SEMAPHORE_CONTRACT_ADDRESS = "0x05f6ed1efe2ab4dd69fb5fef1901c00fed9b9666b7a2b18736081c873a7fa238"
// RPC Provider from environment
export const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_RPC_URL })

export const SEMAPHORE_ABI = SEMAPHORE_CONTRACT_JSON.abi;
