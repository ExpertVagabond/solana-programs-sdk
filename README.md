# solana-programs-sdk

**Unified TypeScript SDK for 14 Solana Anchor programs. Pre-deployed program IDs, IDL imports, PDA helpers, and type-safe Anchor integration.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-9945FF?logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Programs

| Program | Description |
|---------|-------------|
| `escrow` | Two-party atomic token exchange |
| `staking-pool` | Reward-bearing SPL staking |
| `token-faucet` | Rate-limited token distribution |
| `dao-voting` | Token-weighted governance |
| `multisig` | M-of-N threshold approvals |
| `orderbook` | Central limit order matching |
| `nft-mint` | Metaplex NFT minting |
| `nft-gated` | NFT-based access control |
| `price-feed` | Oracle price data |
| `airdrop` | Merkle proof distribution |
| `reputation` | On-chain endorsement scoring |
| `subscription` | Recurring payments |
| `token-vesting` | Linear unlock with cliff |
| `treasury-vault` | Rate-limited withdrawals |

## Install

```bash
npm install @expertvagabond/solana-programs-sdk
```

## Usage

```typescript
import { getEscrowProgram, findEscrowPDA } from '@expertvagabond/solana-programs-sdk';

const program = getEscrowProgram(provider);
const [escrowPda] = findEscrowPDA(maker.publicKey, seed);
```

## License

[MIT](LICENSE)

## Author

Built by [Purple Squirrel Media](https://purplesquirrelmedia.io)
