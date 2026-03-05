import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";

// IDL imports
import escrowIdl from "./idl/solana_escrow.json";
import reputationIdl from "./idl/solana_reputation.json";
import tokenFaucetIdl from "./idl/solana_token_faucet.json";
import stakingPoolIdl from "./idl/solana_staking_pool.json";
import daoVotingIdl from "./idl/solana_dao_voting.json";

// Program IDs (devnet deployed)
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
  nftGated: new PublicKey("9GJ7Y4hLsNMAt9KtuSGn95UbCnPXRhBVCXed9Y7GHUpJ"),
  airdrop: new PublicKey("CNcG4AK4uUXsqAjKQiFk5i9zU75MdHmgdJDXa5cCgYDH"),
} as const;

// IDL exports
export const IDL = {
  escrow: escrowIdl as Idl,
  reputation: reputationIdl as Idl,
  tokenFaucet: tokenFaucetIdl as Idl,
  stakingPool: stakingPoolIdl as Idl,
  daoVoting: daoVotingIdl as Idl,
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

export function findStakeEntryPda(pool: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), pool.toBuffer(), owner.toBuffer()],
    PROGRAM_IDS.stakingPool
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

export function findAirdropClaimPda(airdrop: PublicKey, claimer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("claim"), airdrop.toBuffer(), claimer.toBuffer()],
    PROGRAM_IDS.airdrop
  );
}
