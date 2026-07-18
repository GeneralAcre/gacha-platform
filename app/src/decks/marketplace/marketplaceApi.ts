import { web3, BN, type Program } from '@coral-xyz/anchor'

export const PROGRAM_ID = new web3.PublicKey('4re47fFt4ty2BkNS9NuhBUqDSbGZYhydkt42f4c9E7zv')
export const TOKEN_PROGRAM_ID = new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const ASSOCIATED_TOKEN_PROGRAM_ID = new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const CARD_RECORD_SEED = Buffer.from('card_record')
const MOMENT_RECORD_SEED = Buffer.from('moment_record')
const LISTING_SEED = Buffer.from('listing')
const TREASURY_SEED = Buffer.from('treasury')

export function cardRecordPda(mint: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync([CARD_RECORD_SEED, mint.toBuffer()], PROGRAM_ID)[0]
}

export function momentRecordPda(mint: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync([MOMENT_RECORD_SEED, mint.toBuffer()], PROGRAM_ID)[0]
}

export function listingPda(mint: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync([LISTING_SEED, mint.toBuffer()], PROGRAM_ID)[0]
}

export function treasuryPda(): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync([TREASURY_SEED], PROGRAM_ID)[0]
}

export function ataPda(owner: web3.PublicKey, mint: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

interface ListingAccount {
  seller: web3.PublicKey
  mint: web3.PublicKey
  price: BN | bigint | number
  bump: number
}

interface CardRecordAccount {
  mint: web3.PublicKey
  rarity: number
  cardSeed: number
  pullIndex: number
  category: number
  special: number
}

interface MomentRecordAccount {
  mint: web3.PublicKey
  fixtureId: number
  kind: number
  rarity: number
  deltaBps: number
  signature: number[]
}

// The plain-JSON IDL import doesn't give full codegen typing for program.account's
// dynamically-keyed namespaces (same limitation PullScreen.tsx already works around for
// `player` via a cast) — this is the same workaround, scoped to the accounts this module needs.
interface AccountNamespace<T> {
  all: () => Promise<{ publicKey: web3.PublicKey; account: T }[]>
  fetchNullable: (address: web3.PublicKey) => Promise<T | null>
}

function accounts(program: Program) {
  return program.account as unknown as {
    listing: AccountNamespace<ListingAccount>
    cardRecord: AccountNamespace<CardRecordAccount>
    momentRecord: AccountNamespace<MomentRecordAccount>
  }
}

export interface CardListing {
  kind: 'card'
  listingPda: web3.PublicKey
  seller: web3.PublicKey
  mint: web3.PublicKey
  priceLamports: number
  rarity: number
  cardSeed: number
  category: number
  special: number
}

export interface MomentListing {
  kind: 'moment'
  listingPda: web3.PublicKey
  seller: web3.PublicKey
  mint: web3.PublicKey
  priceLamports: number
  fixtureId: number
  momentKind: number
  rarity: number
  deltaBps: number
}

export type MarketListing = CardListing | MomentListing

function toLamports(price: ListingAccount['price']): number {
  return typeof price === 'number' ? price : Number(price.toString())
}

/** Every active listing, classified as a Tarot card or a World Cup Moment by checking
 * which record PDA actually exists for that mint — the marketplace program itself doesn't
 * care which type backs a mint, so this is purely a display-layer lookup. */
export async function fetchListings(program: Program): Promise<MarketListing[]> {
  const ns = accounts(program)
  const raw = await ns.listing.all()

  const results = await Promise.all(
    raw.map(async ({ publicKey, account }): Promise<MarketListing | null> => {
      const priceLamports = toLamports(account.price)

      const cardRecord = await ns.cardRecord.fetchNullable(cardRecordPda(account.mint))
      if (cardRecord) {
        return {
          kind: 'card',
          listingPda: publicKey,
          seller: account.seller,
          mint: account.mint,
          priceLamports,
          rarity: cardRecord.rarity,
          cardSeed: cardRecord.cardSeed,
          category: cardRecord.category,
          special: cardRecord.special,
        }
      }

      const momentRecord = await ns.momentRecord.fetchNullable(momentRecordPda(account.mint))
      if (momentRecord) {
        return {
          kind: 'moment',
          listingPda: publicKey,
          seller: account.seller,
          mint: account.mint,
          priceLamports,
          fixtureId: momentRecord.fixtureId,
          momentKind: momentRecord.kind,
          rarity: momentRecord.rarity,
          deltaBps: momentRecord.deltaBps,
        }
      }

      // Shouldn't happen — every listed mint was minted by this program — but skip
      // gracefully rather than crash the whole marketplace view on one bad entry.
      return null
    })
  )

  return results.filter((listing): listing is MarketListing => listing !== null)
}
