import SEMACAIRO_CONTRACT_JSON from '../semacairo_Semaphore.contract_class.json'; 

import { RpcProvider } from 'starknet'

export const SEMACAIRO_CONTRACT_ADDRESS = "0x023e76e23822b88b2e7d0228c1bc6361d44a560013030f0f3923884556cfa85d"
// RPC Provider from environment
export const provider = new RpcProvider({ nodeUrl: import.meta.env.VITE_RPC_URL })

export const SEMACAIRO_ABI = SEMACAIRO_CONTRACT_JSON.abi;
