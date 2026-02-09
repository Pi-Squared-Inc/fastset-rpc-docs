import * as ed from "@noble/ed25519";
import { 
    SET_TOKEN_ID, 
    proxy_getAccountInfo, 
    proxy_faucetDrip, 
    proxy_submitTransaction, 
    computeTokenId, 
    signTransaction,
    randomPrivateKey,
    getPublicKey
} from "./fastset-types";
import { bcs } from "@mysten/bcs";

// --- Helpers ---
const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

// --- Main ---
async function main() {
  console.log("🚀 Starting FastSet Skill Test...");

  // 1. Wallet Management
  console.log("\n--- 1. Wallet Management ---");
  const sk1 = randomPrivateKey();
  const pk1 = getPublicKey(sk1);
  const sk2 = randomPrivateKey();
  const pk2 = getPublicKey(sk2);
  
  console.log("Generated Wallet 1 PK:", toHexString(pk1));
  console.log("Generated Wallet 2 PK:", toHexString(pk2));

  // 2. Faucet & Balance
  console.log("\n--- 2. Faucet & Balance ---");
  const PROXY = "https://proxy.fastset.xyz";
  
  await proxy_faucetDrip(PROXY, pk1, "de0b6b3a7640000", null);
  
  let info1 = await proxy_getAccountInfo(PROXY, pk1);
  for(let i=0; i<3; i++) {
    if(info1.result && info1.result.balance !== "0") break;
    await new Promise(r => setTimeout(r, 1000));
    info1 = await proxy_getAccountInfo(PROXY, pk1);
  }
  console.log("Wallet 1 Balance:", info1.result?.balance);
  let nonce = info1.result?.next_nonce || 0;

  // 3. Transfer
  console.log("\n--- 3. Transfer ---");
  const txTransfer = {
    sender: pk1, recipient: pk2, nonce: nonce,
    timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
    claim: { TokenTransfer: { token_id: SET_TOKEN_ID, amount: "ffff", user_data: null } },
    archival: false,
  };
  
  let sig = signTransaction(sk1, txTransfer);
  let res = await proxy_submitTransaction(PROXY, txTransfer, sig);
  console.log("Transfer:", res.result ? "✅ Success" : "❌ Failed " + JSON.stringify(res.error));
  if(res.result) nonce++;

  // 4. Token Creation
  console.log("\n--- 4. Token Creation ---");
  const txCreate = {
    sender: pk1, recipient: pk1, nonce: nonce,
    timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
    claim: {
        TokenCreation: {
            token_name: "TestToken",
            decimals: 18,
            initial_amount: "1000000",
            mints: [pk1],
            user_data: null,
        }
    },
    archival: false
  };

  sig = signTransaction(sk1, txCreate);
  res = await proxy_submitTransaction(PROXY, txCreate, sig);
  console.log("Token Creation:", res.result ? "✅ Success" : "❌ Failed " + JSON.stringify(res.error));
  
  let newTokenId: Uint8Array | null = null;
  if (res.result) {
      info1 = await proxy_getAccountInfo(PROXY, pk1);
      for(let i=0; i<3; i++) {
        if(info1.result && info1.result.token_balance && info1.result.token_balance.length > 0) break;
        await new Promise(r => setTimeout(r, 1000));
        info1 = await proxy_getAccountInfo(PROXY, pk1);
      }
      
      if (info1.result && info1.result.token_balance.length > 0) {
          const rawTokenId = info1.result.token_balance[0][0];
          newTokenId = new Uint8Array(rawTokenId);
          console.log("New Token ID (fetched):", toHexString(newTokenId));
      } else {
          console.log("⚠️ Could not find new token in account balance.");
      }
      nonce++;
  }

  if (newTokenId) {
      // 5. Mint
      console.log("\n--- 5. Mint ---");
      const txMint = {
        sender: pk1, recipient: pk1, nonce: nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim: {
            Mint: {
                token_id: newTokenId,
                amount: "100",
            }
        },
        archival: false
      };
      
      sig = signTransaction(sk1, txMint);
      res = await proxy_submitTransaction(PROXY, txMint, sig);
      console.log("Mint:", res.result ? "✅ Success" : "❌ Failed " + JSON.stringify(res.error));
      if(res.result) nonce++;

      // 6. Token Management (Add Minter)
      console.log("\n--- 6. Token Management ---");
      const txManage = {
        sender: pk1, recipient: pk1, nonce: nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim: {
            TokenManagement: {
                token_id: newTokenId,
                update_id: 0, 
                new_admin: null,
                mints: [ [{Add: []}, pk2] ], 
                user_data: null
            }
        },
        archival: false
      };
      
      sig = signTransaction(sk1, txManage);
      res = await proxy_submitTransaction(PROXY, txManage, sig);
      console.log("Token Management:", res.result ? "✅ Success" : "❌ Failed " + JSON.stringify(res.error));
      if(res.result) nonce++;
  }

  // 7. Batch
  console.log("\n--- 7. Batch ---");
  if (newTokenId) {
    const txBatch = {
        sender: pk1, recipient: pk1, 
        nonce: nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim: {
            Batch: [
                { TokenTransfer: { token_id: SET_TOKEN_ID, recipient: pk2, amount: "10", user_data: null } },
                { TokenTransfer: { token_id: newTokenId, recipient: pk2, amount: "10", user_data: null } }
            ]
        },
        archival: false
    };

    sig = signTransaction(sk1, txBatch);
    res = await proxy_submitTransaction(PROXY, txBatch, sig);
    console.log("Batch:", res.result ? "✅ Success" : "❌ Failed " + JSON.stringify(res.error));
  }

  console.log("\nDone.");
}

main().catch(console.error);
