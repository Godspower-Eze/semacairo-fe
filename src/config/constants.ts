export const SEMAPHORE_CONTRACT_ADDRESS = "0x00a6478a47e9f522ec5d5cc5632d2c73f3353e0a7505e23a8194453b09d213f5"

export const SEMAPHORE_ABI = [
    {
        "name": "ISemaphore",
        "type": "interface",
        "items": [
            {
                "name": "create_group",
                "type": "function",
                "inputs": [
                    {
                        "name": "group_id",
                        "type": "core::integer::u256"
                    },
                    {
                        "name": "depth",
                        "type": "core::integer::u8"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "name": "add_member",
                "type": "function",
                "inputs": [
                    {
                        "name": "group_id",
                        "type": "core::integer::u256"
                    },
                    {
                        "name": "identity_commitment",
                        "type": "core::felt252"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "name": "get_root",
                "type": "function",
                "inputs": [
                    {
                        "name": "group_id",
                        "type": "core::integer::u256"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::felt252"
                    }
                ],
                "state_mutability": "view"
            }
        ]
    },
    {
        "name": "Semaphore",
        "type": "impl",
        "interface_name": "semacairo::semaphore::ISemaphore"
    },
    {
        "name": "GroupCreated",
        "type": "event",
        "kind": "struct",
        "members": [
            {
                "name": "group_id",
                "type": "core::integer::u256",
                "kind": "key"
            },
            {
                "name": "depth",
                "type": "core::integer::u8",
                "kind": "data"
            }
        ]
    },
    {
        "name": "MemberAdded",
        "type": "event",
        "kind": "struct",
        "members": [
            {
                "name": "group_id",
                "type": "core::integer::u256",
                "kind": "key"
            },
            {
                "name": "index",
                "type": "core::integer::u256",
                "kind": "data"
            },
            {
                "name": "identity_commitment",
                "type": "core::felt252",
                "kind": "data"
            },
            {
                "name": "root",
                "type": "core::felt252",
                "kind": "data"
            }
        ]
    }
]
