---
name: solana-domain-knowledge
description: Solana blockchain domain knowledge for the AI agent — covers accounts, transactions, tokens, NFTs, DeFi, and DevNet operations
type: knowledge
---

# Solana Blockchain Domain Knowledge

This skill provides the AI agent with comprehensive Solana domain knowledge to assist users accurately.

## Core Concepts

### Account Model
- Every piece of data on Solana is stored in an **account**
- Accounts have a `lamports` balance (rent), a `data` field, and an `owner` (Program)
- **System Program** owns regular wallet accounts
- Wallets are identified by a **public key** (base58, 32 bytes, ~44 chars)
- Rent: accounts must hold enough lamports to be **rent-exempt** (~0.00089 SOL for empty accounts)

### Transactions
- A Solana transaction contains one or more **instructions**
- Each instruction specifies: Program ID, accounts list, and instruction data
- Transactions are **atomic** — all instructions succeed or all fail
- **Fee payer** is the signer who pays the transaction fee (~0.000005 SOL)
- Transactions are serialized as bytes; unsigned txs can be passed to wallets for signing

### Signing & Wallets
- Private keys never leave the wallet (Phantom, Solflare, etc.)
- The AI agent **never signs** transactions — only provides unsigned serialized transactions
- Users sign via Phantom wallet SDK after reviewing transaction details
- `signAndSendTransaction` is called on the wallet, not the agent

## SOL & Lamports

- **1 SOL = 1,000,000,000 lamports**
- SOL is the native currency of Solana
- Transfer: use `SystemProgram.transfer({ fromPubkey, toPubkey, lamports })`
- Always check balance before sending: need `amount + fee` lamports

## Tokens (SPL Token)

- **SPL Token** is the standard for fungible tokens on Solana
- Each token has a **Mint account** (defines supply, decimals, authority)
- Each user has an **Associated Token Account (ATA)** per token mint
- Common tokens:
  - SOL (native): `So11111111111111111111111111111111111111112`
  - USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
  - USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## NFTs (Non-Fungible Tokens)

- NFTs on Solana use **Token Metadata Program** (Metaplex): `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- An NFT is an SPL Token with **supply = 1, decimals = 0**
- Metadata includes: name, symbol, URI (pointing to JSON metadata), royalty (basis points)
- **DAS API** (Digital Asset Standard) is used to query NFT ownership via `getAssetsByOwner`
- Metaplex NFT URI example: `https://arweave.net/<hash>` or `https://ipfs.io/ipfs/<hash>`
- **Royalty**: `sellerFeeBasisPoints = 500` means 5% (500 / 10000)

## DeFi — Jupiter Swap

- **Jupiter** is the main DEX aggregator on Solana
- API v6: `https://quote-api.jup.ag/v6/`
  - GET `/quote` — get swap quote
  - POST `/swap` — get swap transaction
- `slippageBps`: slippage tolerance in basis points (50 = 0.5%)
- Returns a serialized transaction that the user signs

## Programs (Smart Contracts)

- Solana programs are **stateless, immutable** once deployed
- State is stored in accounts **owned** by the program
- **PDA (Program Derived Address)**: deterministic address from seeds + program ID
- Common programs:
  - System Program: `11111111111111111111111111111111`
  - Token Program: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
  - Metaplex Token Metadata: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

## DevNet

- **Solana DevNet** is the development network — no real value
- DevNet RPC: `https://api.devnet.solana.com`
- **Airdrop**: up to 2 SOL per request on DevNet (free)
  - CLI: `solana airdrop 2 <address> --url devnet`
  - RPC: `connection.requestAirdrop(publicKey, lamports)`
- DevNet resets periodically; account data may be lost
- Solana Explorer (DevNet): `https://explorer.solana.com/?cluster=devnet`

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INVALID_ADDRESS` | Invalid base58 public key | Ask user to provide correct address |
| `RPC_ERROR` | Network / RPC failure | Suggest retry |
| `INSUFFICIENT_BALANCE` | Not enough SOL | Suggest airdrop (DevNet) |
| `RATE_LIMITED` | RPC rate limit hit | Wait and retry |
| `NETWORK_MISMATCH` | Wrong network (not DevNet) | Ask user to switch to DevNet |

## Available Tools

| Tool | Purpose |
|------|---------|
| `getBalanceTool` | Query SOL balance for an address |
| `transferSolTool` | Build unsigned SOL transfer transaction |
| `getNftsTool` | List NFTs owned by a wallet (DAS API) |
| `mintNftTool` | Build unsigned NFT mint transaction |
| `jupiterSwapTool` | Build unsigned token swap transaction via Jupiter |
| `airdropTool` | Request DevNet SOL airdrop |
| `callProgramTool` | Build unsigned generic Program call transaction |
