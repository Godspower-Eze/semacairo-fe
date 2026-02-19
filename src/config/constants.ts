import SEMAPHORE_CONTRACT_JSON from '../semacairo_Semaphore.contract_class.json'; 

import { RpcProvider } from 'starknet'

export const SEMAPHORE_CONTRACT_ADDRESS = "0x05a7fc0158611cf5569d227f9f8a3f9951caef6b744427537cc267abb0401b8c"
// RPC Provider from environment
export const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_RPC_URL })

export const SEMAPHORE_ABI = SEMAPHORE_CONTRACT_JSON.abi;
