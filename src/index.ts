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

// Program IDs
export const PROGRAM_IDS = {
  escrow: new PublicKey("FKz12mj5HcA9wJRTmpEN2mstdat7KVrwJyy1QULaVi4J"),
  reputation: new PublicKey("ChWH3iGNS4cwrpH1jz1BRVZqVteS177yr6Pe4Y8MFBQ"),
  tokenFaucet: new PublicKey("GsHPNhJtQ23Nj2duABZNDAdn1ri2kjxkeTXqH6SUSN1v"),
  stakingPool: new PublicKey("E3xDfoQKgqdCNgnK1B77xgRjKYjEsBCXvPxZDGoxercH"),
  daoVoting: new PublicKey("6wGk7DpNBYDgwW4JZoRjdLB6iNni2AzhyuhiFsgES9ax"),
  priceFeed: new PublicKey("6uafjLqqMeP4DgYqDuVPCL9BVabC7ruQC6SnDdUvXqC5"),
  tokenVesting: new PublicKey("9e9VNYBpSGHbF2xbhGJyZDp33WGUQ6S1kpjDxoQXijbp"),
  subscription: new PublicKey("AqkVLdxNgW5Hw7BEzzTiKME3rnWLLspWhMqKcWsgiqGR"),
  orderbook: new PublicKey("41q8aXfcpqREjcFRK276KzBRRXWvmfYGqCDHZQ4CPwnX"),
  nftMint: new PublicKey("HoNCn3uuMYzQ83i4zjHWhUqEBY9DNEqJfu9vKJF8NQWU"),
  treasuryVault: new PublicKey("D8ypRqJ45ZLAKmMPTLDuwJZubKgKbHZEXHrQ5T6ArVmE"),
  multisig: new PublicKey("3AZTsn99QJnAVJ7gJE5QWgbWgj5jJ8D6wEBn89fKJvJH"),
  nftGated: new PublicKey("F17Fg2ZHx1UZqNCBeueuuiDiVJwBLP8NqrLCPJPFQ4Pg"),
  airdrop: new PublicKey("CNcG4AK4uUXsqAjKQiFk5i9zU75MdHmgdJDXa5cCgYDH"),
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
