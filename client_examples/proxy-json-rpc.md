# FastSet Proxy JSON-RPC API Documentation

## Request/Response Structure

The request/response uses standard JSON-RPC structure.

Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "set_submitTransaction",
  "params": {}
}
```

Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Error description"
  }
}
```

## Concrete Usage Examples

All request examples in this section correspond to the `"params"` field in the outer JSON RPC request.

All response examples correspond to the `"result"` field in the outer JSON RPC response.

### Making a Transfer

`set_submitTransaction` (Transfer) Request

```json
{
  "transaction": {
    "sender": [
      154, 54, 214, 32, 28, 167, 28, 176, 251, 186, 39, 213, 81, 59, 54, 46, 62, 103, 88, 63, 206, 13, 47, 238, 108, 81,
      151, 238, 107, 166, 28, 199
    ],
    "nonce": 0,
    "timestamp_nanos": 1753468236948352000,
    "claim": {
      "Transfer": {
        "recipient": {
          "FastSet": [
            231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71,
            19, 11, 80, 3, 251, 10, 76, 103
          ]
        },
        "amount": 1,
        "user_data": null
      }
    }
  },
  "signature": [
    156, 175, 44, 23, 59, 65, 78, 170, 148, 70, 110, 10, 14, 32, 68, 18, 211, 7, 215, 115, 50, 145, 190, 100, 196, 15,
    209, 102, 55, 209, 61, 202, 228, 154, 185, 218, 193, 157, 76, 147, 137, 99, 250, 195, 157, 68, 25, 113, 190, 119,
    217, 209, 215, 133, 238, 24, 139, 165, 104, 118, 67, 91, 138, 4
  ]
}
```

`set_submitTransaction` Response

Note: this response is the same format for all submitTransaction requests regardless of the type of claim

```json
"Submitted"
```

### Creating a Token

`submitTransaction` (TokenCreation) Request

```json
{
  "transaction": {
    "sender": [
      154, 54, 214, 32, 28, 167, 28, 176, 251, 186, 39, 213, 81, 59, 54, 46, 62, 103, 88, 63, 206, 13, 47, 238, 108, 81,
      151, 238, 107, 166, 28, 199
    ],
    "nonce": 1,
    "timestamp_nanos": 1753468236953596000,
    "claim": {
      "TokenCreation": {
        "token_name": "USDC",
        "decimals": 6,
        "initial_amount": 1000000,
        "mints": [
          [
            231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71,
            19, 11, 80, 3, 251, 10, 76, 103
          ]
        ],
        "user_data": null
      }
    }
  },
  "signature": [
    215, 145, 159, 139, 132, 159, 118, 114, 220, 87, 35, 25, 58, 206, 196, 255, 158, 62, 8, 190, 120, 71, 82, 155, 2,
    245, 250, 131, 97, 101, 235, 83, 205, 107, 247, 134, 44, 12, 82, 140, 202, 133, 253, 41, 195, 252, 253, 127, 161,
    107, 250, 109, 109, 129, 185, 180, 198, 238, 110, 80, 235, 147, 224, 14
  ]
}
```

### Minting Tokens

`submitTransaction` (Mint) Request

```json
{
  "transaction": {
    "sender": [
      154, 54, 214, 32, 28, 167, 28, 176, 251, 186, 39, 213, 81, 59, 54, 46, 62, 103, 88, 63, 206, 13, 47, 238, 108, 81,
      151, 238, 107, 166, 28, 199
    ],
    "nonce": 1,
    "timestamp_nanos": 1753468236953811000,
    "claim": {
      "Mint": {
        "token_id": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "recipient": [
          231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71,
          19, 11, 80, 3, 251, 10, 76, 103
        ],
        "amount": 100
      }
    }
  },
  "signature": [
    110, 216, 25, 104, 73, 73, 70, 195, 119, 149, 233, 52, 214, 193, 244, 209, 101, 162, 196, 183, 148, 166, 140, 142,
    39, 15, 84, 230, 56, 41, 237, 94, 101, 148, 15, 16, 135, 38, 141, 162, 214, 56, 77, 7, 191, 174, 86, 146, 67, 62,
    168, 182, 158, 46, 177, 135, 153, 148, 250, 91, 196, 223, 2, 4
  ]
}
```

### Making a Transfer (Custom Token)

`submitTransaction` (TokenTransfer) Request

```json
{
  "transaction": {
    "sender": [
      154, 54, 214, 32, 28, 167, 28, 176, 251, 186, 39, 213, 81, 59, 54, 46, 62, 103, 88, 63, 206, 13, 47, 238, 108, 81,
      151, 238, 107, 166, 28, 199
    ],
    "nonce": 1,
    "timestamp_nanos": 1753468236953983000,
    "claim": {
      "TokenTransfer": {
        "token_id": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "recipient": {
          "FastSet": [
            231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71,
            19, 11, 80, 3, 251, 10, 76, 103
          ]
        },
        "amount": 100,
        "user_data": null
      }
    }
  },
  "signature": [
    201, 223, 70, 182, 48, 124, 188, 163, 187, 80, 118, 238, 24, 86, 219, 130, 247, 72, 203, 40, 218, 213, 143, 152,
    157, 164, 186, 186, 133, 207, 112, 18, 158, 82, 188, 54, 249, 97, 249, 124, 77, 215, 220, 69, 88, 253, 170, 147, 47,
    215, 71, 30, 231, 7, 226, 71, 22, 3, 100, 136, 69, 59, 152, 7
  ]
}
```

### Get test tokens from faucet

`faucetDrip` Request

```json
{
  "recipient": [
    231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71, 19, 11,
    80, 3, 251, 10, 76, 103
  ],
  "amount": 123
}
```

`faucetDrip` Response

```json
{
  "sender": [
    231, 171, 38, 47, 7, 177, 106, 13, 255, 203, 141, 80, 142, 204, 212, 156, 248, 12, 104, 224, 3, 254, 16, 71, 19, 11,
    80, 3, 251, 10, 76, 103
  ],
  "balance": 224,
  "next_nonce": 0,
  "pending_confirmation": null,
  "requested_certificate": null,
  "requested_validated_transaction": null,
  "requested_received_transfers": [],
  "token_balance": [],
  "requested_claims": []
}
```
