const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");

class LeaderboardCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("leaderboard")
                .setDescription(
                    "View the economy leaderboard."
                )
                .addIntegerOption(option =>
                    option
                        .setName("limit")
                        .setDescription(
                            "The number of leaderboard entries to show."
                        )
                        .setRequired(false)
                        .setMinValue(1)
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

        const limit = interaction.options.getInteger(
            "limit"
        );

        let leaderboard;

        try {

            leaderboard = limit === null
                ? economy.getLeaderboard()
                : economy.getLeaderboard(limit);

        } catch (error) {

            const maximumLimit =
                economy.getMaximumLeaderboardLimit();
            const maximumLimitError =
                "Economy leaderboard limit cannot exceed " +
                `${maximumLimit}.`;

            if (error.message !== maximumLimitError) {
                throw error;
            }

            await interaction.reply({
                content:
                    "The leaderboard limit cannot exceed " +
                    `${maximumLimit}.`,
                flags: MessageFlags.Ephemeral
            });

            return;

        }

        if (leaderboard.length === 0) {
            await interaction.reply({
                content:
                    "The economy leaderboard is empty.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const entries = leaderboard.map(entry =>
            `${entry.rank}. <@${entry.userId}> - ` +
            `${entry.balance}`
        );

        await interaction.reply({
            content: [
                "Economy leaderboard:",
                ...entries
            ].join("\n"),
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = LeaderboardCommand;
