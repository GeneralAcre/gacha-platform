use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;
use ephemeral_rollups_sdk::anchor::{delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;

declare_id!("4re47fFt4ty2BkNS9NuhBUqDSbGZYhydkt42f4c9E7zv");

pub const PLAYER_SEED: &[u8] = b"player";

// Pull the pity lever after this many pulls without a Legendary
pub const PITY_THRESHOLD: u32 = 50;

#[ephemeral]
#[program]
pub mod gacha_er {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.pulls_done = 0;
        player.pulls_since_legendary = 0;
        player.last_rarity = 0;
        player.last_card_seed = 0;
        msg!("Player initialized: {:?}", ctx.accounts.payer.key());
        Ok(())
    }

    /// Delegate this player's PDA to the Ephemeral Rollup for instant, fee-free pulls.
    /// Called once on the base layer before a player's first pull.
    pub fn delegate_player(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[PLAYER_SEED, ctx.accounts.payer.key().as_ref()],
            DelegateConfig {
                // Optionally pin a specific ER validator via remaining_accounts[0]
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    /// Request randomness for a pull. Send this to the ER once delegated.
    /// Resolves via callback below.
    pub fn pull_gacha(ctx: Context<PullGachaCtx>, client_seed: u8) -> Result<()> {
        msg!("Requesting VRF randomness for pull...");
        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: instruction::CallbackPullGacha::DISCRIMINATOR.to_vec(),
            caller_seed: [client_seed; 32],
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.player.key(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        });
        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
        Ok(())
    }

    /// Consumes VRF randomness, resolves rarity + card seed, applies pity logic.
    pub fn callback_pull_gacha(
        ctx: Context<CallbackPullGachaCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;

        // Byte 0 decides rarity tier, byte 1 decides which card within that tier
        let rarity_roll = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 1, 100);
        let card_seed = randomness[1];

        // 0 = Common, 1 = Rare, 2 = Legendary
        let mut rarity: u8 = if rarity_roll <= 60 {
            0
        } else if rarity_roll <= 90 {
            1
        } else {
            2
        };

        // Pity system: force a Legendary if the player has gone too long without one
        if player.pulls_since_legendary >= PITY_THRESHOLD {
            rarity = 2;
        }

        if rarity == 2 {
            player.pulls_since_legendary = 0;
        } else {
            player.pulls_since_legendary = player.pulls_since_legendary.saturating_add(1);
        }

        player.pulls_done = player.pulls_done.saturating_add(1);
        player.last_rarity = rarity;
        player.last_card_seed = card_seed;

        msg!(
            "Pull #{} -> rarity: {}, card_seed: {}",
            player.pulls_done,
            rarity,
            card_seed
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Player::INIT_SPACE,
        seeds = [PLAYER_SEED, payer.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,
    pub system_program: Program<'info, System>,
}

/// Accounts context for delegating the player PDA to the Ephemeral Rollup.
/// The #[delegate] macro injects the buffer/record/metadata/delegation_program
/// accounts needed by delegate_pda().
#[delegate]
#[derive(Accounts)]
pub struct DelegateInput<'info> {
    pub payer: Signer<'info>,
    /// CHECK: the player PDA being delegated
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[vrf]
#[derive(Accounts)]
pub struct PullGachaCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [PLAYER_SEED, payer.key().as_ref()], bump)]
    pub player: Account<'info, Player>,
    /// CHECK: oracle queue, validated against the SDK default
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CallbackPullGachaCtx<'info> {
    /// CHECK: enforces this callback is invoked via CPI by the VRF program
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub player: Account<'info, Player>,
}

#[account]
#[derive(InitSpace)]
pub struct Player {
    pub pulls_done: u32,
    pub pulls_since_legendary: u32,
    pub last_rarity: u8,
    pub last_card_seed: u8,
}
