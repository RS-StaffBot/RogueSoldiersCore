const {
    MessageFlags,
    SlashCommandBuilder,
    TimestampStyles,
    time
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");

class DailyCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("daily")
                .setDescription(
                    "Claim your daily economy reward."
                )
        );

    }

    async execute(interaction) {

        const moduleManager = Registry.get("modules");
        const economy = moduleManager.get("Economy");

        if (!economy) {
            throw new Error(
                "Economy Module is not available."
            );
        }

        const userId = interaction.user.id;

        try {

            const claim = economy.claimDaily(userId);
            const nextClaim = time(
                claim.nextClaimAt,
                TimestampStyles.LongDateTime
            );

            await interaction.reply({
                content: [
                    `Daily reward claimed: ${claim.amount}.`,
                    `New balance: ${claim.balanceAfter}.`,
                    `Next claim: ${nextClaim}.`
                ].join("\n"),
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {

            if (
                error.message !==
                "Economy daily reward is still on cooldown."
            ) {
                throw error;
            }

            const status = economy.getDailyStatus(userId);
            const nextClaim = time(
                status.nextClaimAt,
                TimestampStyles.LongDateTime
            );

            await interaction.reply({
                content: [
                    "Your daily reward is still on cooldown.",
                    `Next claim: ${nextClaim}.`
                ].join("\n"),
                flags: MessageFlags.Ephemeral
            });

        }

    }

}

module.exports = DailyCommand;
