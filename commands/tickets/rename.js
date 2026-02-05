const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, ICONS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Rename the current ticket channel.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The new name for the channel')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        const newName = interaction.options.getString('name');
        await this.handleRename(interaction, newName);
    },
    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [createErrorEmbed('You do not have permission to manage channels.')] });
        }
        if (args.length === 0) {
            return message.reply({ embeds: [createErrorEmbed('Please provide a new name.')] });
        }
        const newName = args.join('-'); // Ticket names usually use dashes
        await this.handleRename(message, newName);
    },
    async handleRename(source, newName) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        // Basic check if it's a ticket channel (optional, but good practice)
        // For now, we allow renaming any channel if they have perms, as requested "rename canal para los tickets"
        // but restricting to tickets requires DB check or name convention check.
        // User implied "para los tickets", but a general rename is useful too.

        try {
            const oldName = source.channel.name;
            await source.channel.setName(newName);

            const embed = createSuccessEmbed('Channel Renamed',
                `> **From:** ${oldName}\n> **To:** ${newName}`
            );
            await reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error renaming channel:', error);
            await reply({ embeds: [createErrorEmbed('Failed to rename channel (Missing Permissions or Rate Limit?)')] });
        }
    }
};











