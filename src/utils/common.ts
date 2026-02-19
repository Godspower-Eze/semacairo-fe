import type { BigNumberish } from "ethers"
import { keccak256 } from "ethers/crypto"
import { toBeHex } from "ethers/utils"
import type { NumericString } from "snarkjs"
import { encodeBytes32String, toBigInt as ethersToBigInt } from 'ethers'
import {unpackGroth16Proof, type PackedGroth16Proof} from "@zk-kit/utils"
import * as garaga from 'garaga';
import { hash, cairo, Contract } from 'starknet'

import { parseGroth16VerifyingKeyFromObject, parseGroth16ProofFromObject } from '../utils/garaga';
import semaphoreVkData from '../verification_key.json'; 
import { provider, SEMAPHORE_CONTRACT_ADDRESS, SEMAPHORE_ABI } from '../config/constants';

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
    } catch (error) {
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
) {
    await garaga.init();
    const snarksProof = unpackGroth16Proof(packedProof);
    const proof = parseGroth16ProofFromObject(snarksProof, publicInputs);
    console.log(proof)

    const verificationKey = {
        ...semaphoreVkData,
        vk_delta_2: semaphoreVkData.vk_delta_2[depth - 1],
        IC: semaphoreVkData.IC[depth - 1]
    }
    const vk = parseGroth16VerifyingKeyFromObject(verificationKey);

    return garaga.getGroth16CallData(proof, vk, proof.a.curveId);
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
            address: SEMAPHORE_CONTRACT_ADDRESS,
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
    const semaphoreContract = new Contract(SEMAPHORE_ABI, SEMAPHORE_CONTRACT_ADDRESS, provider);
    const result = await semaphoreContract.call('get_group_depth', [groupId], { blockIdentifier: 'latest' })
    return Number(result)
}