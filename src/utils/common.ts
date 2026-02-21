import type { BigNumberish } from "ethers"
import { keccak256 } from "ethers/crypto"
import { toBeHex } from "ethers/utils"
import type { NumericString } from "snarkjs"
import { encodeBytes32String, toBigInt as ethersToBigInt } from 'ethers'
import {unpackGroth16Proof, type PackedGroth16Proof} from "@zk-kit/utils"
import * as garaga from 'garaga';
import { hash, cairo, Contract } from 'starknet'

import { parseGroth16VerifyingKeyFromObject, parseGroth16ProofFromObject } from '../utils/garaga';
import semacairoVkData from '../verification_key.json'; 
import { provider, SEMACAIRO_CONTRACT_ADDRESS, SEMACAIRO_ABI } from '../config/constants';

/**
 * Creates a keccak256 hash of a message compatible with the SNARK scalar modulus.
 * @param message The message to be hashed.
 * @returns The message digest.
 */
export function keccakHash(message: BigNumberish): NumericString {
    return (BigInt(keccak256(toBeHex(message, 32))) >> 8n).toString()
}

export const toNumericString = (value: string) => {
    const trimmed = value.trim()

    if (!trimmed) {
        throw new Error('Value is required.')
    }

    try {
        return ethersToBigInt(trimmed).toString()
    } catch {
        return ethersToBigInt(encodeBytes32String(trimmed)).toString()
    }
}

export const normalizePackedProof = (points: string[]): PackedGroth16Proof => {
    if (!Array.isArray(points) || points.length !== 8) {
        throw new Error('Proof points must be an array of 8 values.')
    }

    return points.map((point) => BigInt(point).toString()) as PackedGroth16Proof
}

export async function generateCalldata(
    packedProof: PackedGroth16Proof,
    publicInputs: bigint[],
    depth: number
): Promise<string[]> {
    await garaga.init();
    const snarksProof = unpackGroth16Proof(packedProof);
    const proof = parseGroth16ProofFromObject(snarksProof, publicInputs);

    const verificationKey = {
        ...semacairoVkData,
        vk_delta_2: semacairoVkData.vk_delta_2[depth - 1],
        IC: semacairoVkData.IC[depth - 1]
    }
    const vk = parseGroth16VerifyingKeyFromObject(verificationKey);
    const result = garaga.getGroth16CallData(proof, vk, 0);
    return result.map((x: bigint) => x.toString());
}

export async function fetchGroupMembers(groupId: string): Promise<bigint[]> {
    const gid = cairo.uint256(groupId)
    const targetLow = "0x" + gid.low.toString()
    const targetHigh = "0x" + gid.high.toString()
    const members: bigint[] = []
    let continuationToken: string | undefined = undefined

    // Event key for MemberAdded (sn_keccak of "MemberAdded")
    const MEMBER_ADDED_KEY = hash.getSelectorFromName('MemberAdded')
    do {
        const result = await provider.getEvents({
            from_block: { block_number: 5500000 },
            to_block: 'latest',
            address: SEMACAIRO_CONTRACT_ADDRESS,
            keys: [[MEMBER_ADDED_KEY]],
            chunk_size: 100,
            ...(continuationToken ? { continuation_token: continuationToken } : {})
        })

        for (const event of result.events) {
            if (event.keys) {
                const eventLow = event.keys[1]
                const eventHigh = event.keys[2]
                if (eventLow === targetLow && eventHigh === targetHigh) {
                    // Data format: [commitment]
                    const low = BigInt(event.data[2])
                    const high = BigInt(event.data[3])
                    const commitment = (high << 128n) + low
                    members.push(commitment)
                }
            }
        }

        continuationToken = result.continuation_token
    } while (continuationToken)

    return members
}

export async function getGroupDepth(groupId: string): Promise<number> {
    const semacairoContract = new Contract(SEMACAIRO_ABI, SEMACAIRO_CONTRACT_ADDRESS, provider);
    const result = await semacairoContract.call('get_group_depth', [groupId], { blockIdentifier: 'latest' })
    return Number(result)
}

export async function isNullifierUsed(nullifier: string): Promise<boolean> {
    const semacairoContract = new Contract(SEMACAIRO_ABI, SEMACAIRO_CONTRACT_ADDRESS, provider);
    const n = BigInt(nullifier);
    const result = await semacairoContract.call('is_nullifier_used', [n], { blockIdentifier: 'latest' })
    return result as boolean
}

export interface GroupInfo {
    id: string;
    depth: number;
    admin: string;
}

export async function fetchAllGroups(): Promise<GroupInfo[]> {
    const GROUP_CREATED_KEY = hash.getSelectorFromName('GroupCreated')
    let continuationToken: string | undefined = undefined
    const groups: GroupInfo[] = []

    do {
        const result = await provider.getEvents({
            from_block: { block_number: 647000 },
            to_block: 'latest',
            address: SEMACAIRO_CONTRACT_ADDRESS,
            keys: [[GROUP_CREATED_KEY]],
            chunk_size: 100,
            ...(continuationToken ? { continuation_token: continuationToken } : {})
        })

        for (const event of result.events) {
            if (event.keys && event.data) {
                // event.keys = [key, group_id_low, group_id_high]
                // event.data = [depth, admin]
                const low = BigInt(event.keys[1])
                const high = BigInt(event.keys[2])
                const groupId = (high << 128n) + low
                const depth = Number(event.data[0])
                const admin = event.data[1]
                groups.push({ id: groupId.toString(), depth, admin })
            }
        }
        continuationToken = result.continuation_token
    } while (continuationToken)

    return groups
}