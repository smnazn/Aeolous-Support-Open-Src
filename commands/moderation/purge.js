const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');
const { getLogChannel } = require('../../utils/serverLogs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of messages.')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        await this.handlePurge(interaction, amount, interaction.user);
    },
    async messageRun(message, args) {
        const isOwner = message.author.id === process.env.OWNER_ID;
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setDescription('**Error:** You do not have permission to manage messages.')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        if (args.length === 0) {
            const prefix = await getPrefix(message.guild.id);
            return message.reply(`Usage: ${prefix}purge <amount>`);
        }
        const amount = parseInt(args[0]);
        if (isNaN(amount)) return message.reply('Invalid amount.');
        await this.handlePurge(message, amount, message.author);
    },
    async handlePurge(source, amount, executor) {
        if (amount < 1 || amount > 100) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** Amount must be between 1 and 100.`)
                .setColor(0x2B2D31);
            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const channel = source.channel;

        try {
            // Delete messages
            const deleted = await channel.bulkDelete(amount, true);

            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CHECKMARK} **Deleted ${deleted.size} messages.**`)
                .setColor(0x2B2D31);

            // Always send a new message, never reply (since the original might be deleted)
            const msg = await channel.send({ embeds: [embed] });
            setTimeout(() => msg.delete().catch(() => { }), 3000);

            // Log the purge action
            const logData = await getLogChannel(source.guild, 'logMessageDelete');
            if (logData) {
                const logEmbed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.TRASH} Messages Purged`)
                    .setDescription(
                        `${DISCO_ICONS.MEMBER} **Ejecutado por:** ${executor.tag} (<@${executor.id}>)\n` +
                        `${DISCO_ICONS.CHANNEL} **Canal:** <#${channel.id}>\n` +
                        `${DISCO_ICONS.INFO} **Mensajes eliminados:** ${deleted.size}`
                    )
                    .setColor('#FF0000')
                    .setTimestamp();
                await logData.channel.send({ embeds: [logEmbed] }).catch(() => { });
            }
        } catch (err) {
            console.error(err);
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** Failed to delete messages.`)
                .setColor(0x2B2D31);
            await channel.send({ embeds: [embed] });
        }
    }
};












