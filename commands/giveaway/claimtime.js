const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claimtime')
        .setDescription('Configure giveaway claim times.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setrole')
                .setDescription('Set claim time for a specific role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Claim time in seconds (e.g., 10, 20, 30)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(300)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setdefault')
                .setDescription('Set default claim time')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Default claim time in seconds (e.g., 5, 10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(300)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all configured claim times'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removerole')
                .setDescription('Remove claim time for a role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to remove')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Note: Giveaway model might not be the best place for config, but following existing pattern.
        // It seems the user is using the Giveaway model itself to store configuration? 
        // Or maybe this is legacy code. Assuming we just need to update it, not fix the schema design right now.

        if (subcommand === 'setrole') {
            const role = interaction.options.getRole('role');
            const seconds = interaction.options.getInteger('seconds');

            await Giveaway.updateMany(
                { guildId },
                { $pull: { claimTimeRoles: { roleId: role.id } } }
            );

            await Giveaway.updateMany(
                { guildId },
                { $push: { claimTimeRoles: { roleId: role.id, seconds } } }
            );

            const embed = createSuccessEmbed('Claim Time Set',
                `${ICONS.POINT} Claim time for ${role} set to **${seconds}s**`
            );
            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'setdefault') {
            const seconds = interaction.options.getInteger('seconds');

            await Giveaway.updateMany(
                { guildId },
                { defaultClaimTime: seconds }
            );

            const embed = createSuccessEmbed('Default Claim Time Set',
                `${ICONS.POINT} Default claim time set to **${seconds}s**`
            );
            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'list') {
            let config = await Giveaway.findOne({ guildId }).sort({ createdAt: -1 });

            if (!config) {
                const embed = createErrorEmbed('No giveaway configuration found.');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            let description = `${ICONS.POINT} **Default:** ${config.defaultClaimTime || 10}s\n\n`;

            if (config.claimTimeRoles && config.claimTimeRoles.length > 0) {
                description += '**Role-Specific Times:**\n';
                for (const roleTime of config.claimTimeRoles) {
                    const role = interaction.guild.roles.cache.get(roleTime.roleId);
                    if (role) {
                        description += `${ICONS.POINT} ${role} - **${roleTime.seconds}s**\n`;
                    }
                }
            } else {
                description += '*No role-specific times configured*';
            }

            const embed = createSuccessEmbed('Claim Time Configuration', description);
            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'removerole') {
            const role = interaction.options.getRole('role');

            await Giveaway.updateMany(
                { guildId },
                { $pull: { claimTimeRoles: { roleId: role.id } } }
            );

            const embed = createSuccessEmbed('Claim Time Removed',
                `${ICONS.POINT} Claim time for ${role} removed`
            );
            await interaction.reply({ embeds: [embed] });
        }
    }
};











