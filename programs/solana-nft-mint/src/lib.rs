use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata},
    token::{burn, transfer, Burn, Mint, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::accounts::{MasterEdition as MasterMPL, Metadata as MPL};

declare_id!("3qi59gdvUUTtFZaFAGebD3uiMQPm7vx773FqjTRgcSgh");

#[program]
pub mod solana_nft_mint {
    use anchor_spl::{
        metadata::{create_master_edition_v3, CreateMasterEditionV3},
        token::{mint_to, MintTo},
    };
    use mpl_token_metadata::types::DataV2;

    use super::*;

    pub fn mint_nft(
        ctx: Context<CreateNFT>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let seeds = b"mint";
        let bump = ctx.bumps.token_mint;
        let signer: &[&[&[u8]]] = &[&[seeds, &[bump]]];

        // create mint account
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
            signer,
        );

        mint_to(cpi_context, 1)?;

        // create metadata account
        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
                mint_authority: ctx.accounts.admin.to_account_info(),
                payer: ctx.accounts.admin.to_account_info(),
                update_authority: ctx.accounts.admin.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        create_metadata_accounts_v3(cpi_ctx, data_v2, false, true, None)?;

        //create master edition account
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition_account.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
                update_authority: ctx.accounts.admin.to_account_info(),
                mint_authority: ctx.accounts.admin.to_account_info(),
                payer: ctx.accounts.admin.to_account_info(),
                metadata: ctx.accounts.metadata_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        create_master_edition_v3(cpi_context, None)?;

        Ok(())
    }

    pub fn transfer_nft(ctx: Context<TransferNFT>) -> Result<()> {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender_nft_token_account.to_account_info(),
                to: ctx.accounts.recipient_nft_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        );

        // Add error handling to identify if the transfer fails
        transfer(cpi_context, 1).map_err(|e| {
            // Log or return a custom error message for better debugging
            // error!("Transfer failed: {:?}", e);
            e
        })?;
        Ok(())
    }

    pub fn burn_nft(ctx: Context<BurnNFT>) -> Result<()> {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.nft_token_account.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );

        burn(cpi_ctx, 1)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateNFT<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds=[b"mint"],
        payer=admin,
        bump,
        mint::decimals = 0,
        mint::authority = admin.key(),
        mint::freeze_authority = admin.key(),
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = admin
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    /// CHECK: This account is checked in the CPI to token-metadata program
    #[account(
        mut,
        // can be a wrong import: compare code of this vs v2 find_pda_address
        address=MPL::find_pda(&token_mint.key()).0
    )]
    pub metadata_account: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the CPI to token-metadata program
    #[account(
        mut,
        address=MasterMPL::find_pda(&token_mint.key()).0
    )]
    pub master_edition_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TransferNFT<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        constraint = token_mint.supply == 1 @ ErrorCode::InvalidMintSupply,
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = sender,
        constraint = sender_nft_token_account.amount == 1 @ ErrorCode::InvalidTokenAmount,
    )]
    pub sender_nft_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = sender,
        associated_token::mint = token_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_nft_token_account: Account<'info, TokenAccount>,
    /// CHECK: This is the recipient of the NFT
    pub recipient: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BurnNFT<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        constraint = token_mint.supply == 1 @ ErrorCode::InvalidMintSupply,
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = admin,
        constraint = nft_token_account.amount == 1 @ ErrorCode::InvalidTokenAmount,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    /// CHECK: This account is checked in the CPI to token-metadata program
    #[account(
        mut,
        address = MPL::find_pda(&token_mint.key()).0,
    )]
    pub metadata_account: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the CPI to token-metadata program
    #[account(
        mut,
        address = MasterMPL::find_pda(&token_mint.key()).0,
    )]
    pub master_edition_account: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The mint supply must be exactly 1.")]
    InvalidMintSupply,
    #[msg("The token account must hold exactly 1 token.")]
    InvalidTokenAmount,
}
