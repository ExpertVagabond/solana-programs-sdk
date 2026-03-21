// ── Security: Input Validation & Error Sanitization ──
const SEC = Object.freeze({
  MAX_PUBKEY_LENGTH: 44,
  MAX_SEED_VALUE: BigInt("18446744073709551615"), // u64 max
  PUBKEY_PATTERN: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  SECRET_PATTERNS: /(key|token|secret|password|credential)=\S+/gi,
});

function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? (err.message || '').slice(0, 300) : 'An unexpected error occurred';
  return msg.replace(/\/[^\s:]+/g, '[path]').replace(SEC.SECRET_PATTERNS, '$1=[REDACTED]');
}

function validatePublicKey(key: string): string {
  if (typeof key !== 'string' || !SEC.PUBKEY_PATTERN.test(key)) {
    throw new Error('Invalid public key format');
  }
  return key;
}

function validateSeed(seed: bigint): bigint {
  if (seed < BigInt(0) || seed > SEC.MAX_SEED_VALUE) {
    throw new Error('Seed value out of u64 range');
  }
  return seed;
}

import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// IDL imports
import escrowIdl from "./idl/solana_escrow.json";
import reputationIdl from "./idl/solana_reputation.json";
import tokenFaucetIdl from "./idl/solana_token_faucet.json";
import stakingPoolIdl from "./idl/solana_staking_pool.json";
import daoVotingIdl from "./idl/solana_dao_voting.json";
import tokenVestingIdl from "./idl/solana_token_vesting.json";
import subscriptionIdl from "./idl/solana_subscription.json";
import orderbookIdl from "./idl/solana_orderbook.json";
import nftMintIdl from "./idl/solana_nft_mint.json";
import priceFeedIdl from "./idl/solana_price_feed.json";
import treasuryVaultIdl from "./idl/solana_treasury_vault.json";
import multisigIdl from "./idl/solana_multisig.json";
import nftGatedIdl from "./idl/solana_nft_gated.json";
import airdropIdl from "./idl/solana_airdrop.json";
import flashLoanIdl from "./idl/solana_flash_loan.json";
import ticketingIdl from "./idl/concert_ticket.json";

// Program IDs
export const PROGRAM_IDS = {
  escrow: new PublicKey("FKz12mj5HcA9wJRTmpEN2mstdat7KVrwJyy1QULaVi4J"),
  reputation: new PublicKey("ChWH3iGNS4cwrpH1jz1BRVZqVteS177yr6Pe4Y8MFBQ"),
  tokenFaucet: new PublicKey("GsHPNhJtQ23Nj2duABZNDAdn1ri2kjxkeTXqH6SUSN1v"),
  stakingPool: new PublicKey("E3xDfoQKgqdCNgnK1B77xgRjKYjEsBCXvPxZDGoxercH"),
  daoVoting: new PublicKey("6wGk7DpNBYDgwW4JZoRjdLB6iNni2AzhyuhiFsgES9ax"),
  priceFeed: new PublicKey("6uafjLqqMeP4DgYqDuVPCL9BVabC7ruQC6SnDdUvXqC5"),
  tokenVesting: new PublicKey("9e9VNYBpSGHbF2xbhGJyZDp33WGUQ6S1kpjDxoQXijbp"),
  subscription: new PublicKey("2nj3qrjoiPsxA6sn965UtJeLT5gD8mAFSqFZCsmJQUr2"),
  orderbook: new PublicKey("41q8aXfcpqREjcFRK276KzBRRXWvmfYGqCDHZQ4CPwnX"),
  nftMint: new PublicKey("FxgTrgwz1fZNi5ypcoEFw9YJKYSMj7EdZemfHJuNU2zL"),
  treasuryVault: new PublicKey("Ews62Jxt9GSpFhMSuvweRBSQkyZhnMdCokDp9DpUcchx"),
  multisig: new PublicKey("EVmjpeJPCUGBLRCHZMBusPEqHUDQdAJa4oZHh3LURhy5"),
  nftGated: new PublicKey("F17Fg2ZHx1UZqNCBeueuuiDiVJwBLP8NqrLCPJPFQ4Pg"),
  airdrop: new PublicKey("FZPFToJZbiDnr74xotCMRJtCTHkpuUeaUvrgfZ7HfmMe"),
  flashLoan: new PublicKey("2chVPk6DV21qWuyUA2eHAzATdFSHM7ykv1fVX7Gv6nor"),
  ticketing: new PublicKey("2bmGLNZ1dXFiWcS7x8DffzQVHUuPhhJ4vRKLw2SSdBNB"),
} as const;

// IDL exports
export const IDL = {
  escrow: escrowIdl as Idl,
  reputation: reputationIdl as Idl,
  tokenFaucet: tokenFaucetIdl as Idl,
  stakingPool: stakingPoolIdl as Idl,
  daoVoting: daoVotingIdl as Idl,
  tokenVesting: tokenVestingIdl as Idl,
  subscription: subscriptionIdl as Idl,
  orderbook: orderbookIdl as Idl,
  nftMint: nftMintIdl as Idl,
  priceFeed: priceFeedIdl as Idl,
  treasuryVault: treasuryVaultIdl as Idl,
  multisig: multisigIdl as Idl,
  nftGated: nftGatedIdl as Idl,
  airdrop: airdropIdl as Idl,
  flashLoan: flashLoanIdl as Idl,
  ticketing: ticketingIdl as Idl,
} as const;

// Program factory
export function getProgram(
  name: keyof typeof IDL,
  provider: AnchorProvider
): Program {
  const idl = IDL[name];
  const programId = PROGRAM_IDS[name];
  return new Program(idl, programId, provider);
}

// PDA helpers
export function findEscrowPda(maker: PublicKey, seed: bigint): [PublicKey, number] {
  const seedBytes = Buffer.alloc(8);
  seedBytes.writeBigUInt64LE(seed);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), seedBytes],
    PROGRAM_IDS.escrow
  );
}

export function findVestingPda(authority: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vesting"), authority.toBuffer(), mint.toBuffer()],
    PROGRAM_IDS.tokenVesting
  );
}

export function findStakeEntryPda(pool: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), pool.toBuffer(), owner.toBuffer()],
    PROGRAM_IDS.stakingPool
  );
}

export function findSubscriptionPda(plan: PublicKey, subscriber: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
    PROGRAM_IDS.subscription
  );
}

export function findProposalPda(dao: PublicKey, proposalId: bigint): [PublicKey, number] {
  const idBytes = Buffer.alloc(8);
  idBytes.writeBigUInt64LE(proposalId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), dao.toBuffer(), idBytes],
    PROGRAM_IDS.daoVoting
  );
}

export function findReputationPda(config: PublicKey, wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), config.toBuffer(), wallet.toBuffer()],
    PROGRAM_IDS.reputation
  );
}

export function findClaimRecordPda(faucet: PublicKey, claimer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("claim"), faucet.toBuffer(), claimer.toBuffer()],
    PROGRAM_IDS.tokenFaucet
  );
}

export function findOrderPda(market: PublicKey, orderId: bigint): [PublicKey, number] {
  const idBytes = Buffer.alloc(8);
  idBytes.writeBigUInt64LE(orderId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("order"), market.toBuffer(), idBytes],
    PROGRAM_IDS.orderbook
  );
}

export function findMarketPda(authority: PublicKey, baseMint: PublicKey, quoteMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), authority.toBuffer(), baseMint.toBuffer(), quoteMint.toBuffer()],
    PROGRAM_IDS.orderbook
  );
}

export function findCollectionPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("collection"), authority.toBuffer()],
    PROGRAM_IDS.nftMint
  );
}

export function findNftMetadataPda(collection: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), collection.toBuffer(), mint.toBuffer()],
    PROGRAM_IDS.nftMint
  );
}

export function findPriceFeedPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("feed"), authority.toBuffer()],
    PROGRAM_IDS.priceFeed
  );
}

export function findTreasuryPda(authority: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), authority.toBuffer(), mint.toBuffer()],
    PROGRAM_IDS.treasuryVault
  );
}

export function findMultisigPda(creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("multisig"), creator.toBuffer()],
    PROGRAM_IDS.multisig
  );
}

export function findMultisigTxPda(multisig: PublicKey, txIndex: bigint): [PublicKey, number] {
  const idBytes = Buffer.alloc(8);
  idBytes.writeBigUInt64LE(txIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("tx"), multisig.toBuffer(), idBytes],
    PROGRAM_IDS.multisig
  );
}

export function findGatePda(authority: PublicKey, requiredMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gate"), authority.toBuffer(), requiredMint.toBuffer()],
    PROGRAM_IDS.nftGated
  );
}

export function findAccessPda(gate: PublicKey, holder: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("access"), gate.toBuffer(), holder.toBuffer()],
    PROGRAM_IDS.nftGated
  );
}

export function findAirdropPda(authority: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("airdrop"), authority.toBuffer(), mint.toBuffer()],
    PROGRAM_IDS.airdrop
  );
}

export function findAirdropClaimPda(airdrop: PublicKey, claimer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("claim"), airdrop.toBuffer(), claimer.toBuffer()],
    PROGRAM_IDS.airdrop
  );
}

export function findLendingPoolPda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), tokenMint.toBuffer()],
    PROGRAM_IDS.flashLoan
  );
}

export function findPoolVaultPda(pool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), pool.toBuffer()],
    PROGRAM_IDS.flashLoan
  );
}

export function findDepositReceiptPda(pool: PublicKey, depositor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("deposit_receipt"), pool.toBuffer(), depositor.toBuffer()],
    PROGRAM_IDS.flashLoan
  );
}

export function findFlashLoanReceiptPda(pool: PublicKey, borrower: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("flash_loan_receipt"), pool.toBuffer(), borrower.toBuffer()],
    PROGRAM_IDS.flashLoan
  );
}

export function findVenuePda(venueId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("venue"), Buffer.from(venueId)],
    PROGRAM_IDS.ticketing
  );
}

export function findTicketPda(venueId: string, buyer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ticket"), Buffer.from(venueId), buyer.toBuffer()],
    PROGRAM_IDS.ticketing
  );
}
