const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const AntiLink = require('../../models/AntiLink');
const { createErrorEmbed, createSuccessEmbed, ICONS, COLORS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('Configure the Anti-Link system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('Enable or disable the system')
                .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable?').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Configure what to block')
                .addBooleanOption(opt => opt.setName('links').setDescription('Block all links?'))
                .addBooleanOption(opt => opt.setName('images').setDescription('Block image links?'))
                .addBooleanOption(opt => opt.setName('invites').setDescription('Block Discord invites?')))
        .addSubcommand(sub =>
            sub.setName('whitelist')
                .setDescription('Manage whitelist')
                .addStringOption(opt =>
                    opt.setName('action').setDescription('Add or remove').setRequired(true)
                        .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
                .addRoleOption(opt => opt.setName('role').setDescription('Role to whitelist').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to whitelist').addChannelTypes(ChannelType.GuildText).setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('log')
                .setDescription('Set logging channel')
                .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            let settings = await AntiLink.findOne({ guildId });
            if (!settings) settings = new AntiLink({ guildId });

            if (sub === 'toggle') {
                const enabled = interaction.options.getBoolean('enabled');
                settings.enabled = enabled;
                await settings.save();
                await interaction.reply({ embeds: [createSuccessEmbed('Anti-Link', `System is now **${enabled ? 'ENABLED' : 'DISABLED'}**`)] });

            } else if (sub === 'config') {
                const links = interaction.options.getBoolean('links');
                const images = interaction.options.getBoolean('images');
                const invites = interaction.options.getBoolean('invites');

                if (links !== null) settings.blockLinks = links;
                if (images !== null) settings.blockImages = images;
                if (invites !== null) settings.blockInvites = invites;

                await settings.save();
                await interaction.reply({
                    embeds: [createSuccessEmbed('Configuration Updated',
                        `${ICONS.POINT} Block Links: \`${settings.blockLinks}\`\n` +
                        `${ICONS.POINT} Block Images: \`${settings.blockImages}\`\n` +
                        `${ICONS.POINT} Block Invites: \`${settings.blockInvites}\``
                    )]
                });

            } else if (sub === 'whitelist') {
                const action = interaction.options.getString('action');
                const role = interaction.options.getRole('role');
                const channel = interaction.options.getChannel('channel');

                if (!role && !channel) return interaction.reply({ embeds: [createErrorEmbed('Please provide a role or channel.')], ephemeral: true });

                if (action === 'add') {
                    if (role && !settings.whitelistedroles.includes(role.id)) settings.whitelistedroles.push(role.id);
                    if (channel && !settings.whitelistedchannels.includes(channel.id)) settings.whitelistedchannels.push(channel.id);
                } else {
                    if (role) settings.whitelistedroles = settings.whitelistedroles.filter(id => id !== role.id);
                    if (channel) settings.whitelistedchannels = settings.whitelistedchannels.filter(id => id !== channel.id);
                }

                await settings.save();
                await interaction.reply({ embeds: [createSuccessEmbed('Whitelist Updated', `Successfully ${action}ed ${role || ''} ${channel || ''}`)] });

            } else if (sub === 'log') {
                const channel = interaction.options.getChannel('channel');
                settings.logChannelId = channel.id;
                await settings.save();
                await interaction.reply({ embeds: [createSuccessEmbed('Log Channel Set', `Logging to ${channel}`)] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ embeds: [createErrorEmbed('An error occurred.')], ephemeral: true });
        }
    }
};











