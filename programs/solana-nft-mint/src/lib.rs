use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata},
    token::{burn, mint_to, Burn, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{pda::find_metadata_account, state::DataV2};
// use solana_program::{pubkey, pubkey::Pubkey};

declare_id!("6aUW8srpkah6n7zaMNABCrRryckV1vkkzQK3D4nG6rYL");

// const MAX_HEALTH: u64 = 1000;
// const MAX_DAMAGE: u64 = 500;
// 

// TODO: later add pubkey here
const ADMIN_PUBKEY: Pubkey = pubkey!("6aUW8srpkah6n7zaMNABCrRryckV1vkkzQK3D4nG6rYL");

    // overall fns list: {v1} : normal
    // create mint
    // transfer nft
    // burn

    // v2
    // gamefied
    // fight -> win -> get nft, lose -> loss nft

#[program]
pub mod nft {
    use super::*;
    
    // pub fn mint_nft(
    //     ctx: Context<MintNFT>
    // ) -> Result<()> {
    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        seeds=[b"mint"],
        payer=admin,
        bump,
        mint::decimals = 9,
        mint::authority = token_mint,
    )]
    pub token_mint: Account<'info, Mint>,

    ///CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        address=find_metadata_account(&token_mint.key()).0
    )]
    pub metadata_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// #[program]
// pub mod nft_mint {
//     use super::*;

//     pub fn respawn(ctx: Context<Intialize>) -> Result<()> {
//         // Reset enemy boss to max health
//         ctx.accounts.enemy_boss.health = MAX_HEALTH;
//         Ok(())
//     }

//     pub fn attack(ctx: Context<Attack>) -> Result<()> {
//         // Check if enemy boss has enough health
//         if ctx.accounts.enemy_boss.health == 0 {
//             return err!(ErrorCode::NotEnoughHealth);
//         }

//         // Get current slot
//         let slot = Clock::get()?.slot;
//         // Generate pseudo-random number using XORShift with the current slot as seed
//         let xorshift_output = xorshift64(slot);
//         // Calculate random damage
//         let random_damage = xorshift_output % (MAX_DAMAGE);
//         msg!("Random Damage: {}", random_damage);

//         // Subtract health from enemy boss, min health is 0
//         ctx.accounts.enemy_boss.health =
//             ctx.accounts.enemy_boss.health.saturating_sub(random_damage);
//         msg!("Enemy Boss Health: {}", ctx.accounts.enemy_boss.health);

//         Ok(())
//     }
// }

// #[derive(Accounts)]
// pub struct Intialize<'info> {
//     #[account(mut)]
//     pub player: Signer<'info>,
//     #[account(
//         init_if_needed,
//         payer = player,
//         space = 8 + 8,
//         seeds = [b"boss"],
//         bump,
//     )]
//     pub enemy_boss: Account<'info, EnemyBoss>,
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// pub struct Attack<'info> {
//     #[account(mut)]
//     pub player: Signer<'info>,
//     #[account(
//         mut,
//         seeds = [b"boss"],
//         bump,
//     )]
//     pub enemy_boss: Account<'info, EnemyBoss>,
// }

// #[account]
// pub struct EnemyBoss {
//     pub health: u64,
// }

// #[error_code]
// pub enum ErrorCode {
//     #[msg("Boss at 0 health; respawn to attack.")]
//     NotEnoughHealth,
// }

// pub fn xorshift64(seed: u64) -> u64 {
//     let mut x = seed;
//     x ^= x << 13;
//     x ^= x >> 7;
//     x ^= x << 17;
//     x
// }
