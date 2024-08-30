use anchor_lang::prelude::*;

declare_id!("9V5b1HfrcJyehHgPzU1uhu5D1PvbBTnjYyGF1LdR6UaK");

#[program]
pub mod solana_maze_game {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
