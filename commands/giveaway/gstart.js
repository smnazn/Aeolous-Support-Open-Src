const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { hasStaffPermission } = require('../../utils/staffPermissions');
const { createErrorEmbed, createSuccessEmbed, ICONS, parseTime } = require('../../utils/helpers');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gstart')
        .setDescription('Start a giveaway.')
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 30m, 1d)').setRequired(true))
        .addStringOption(option => option.setName('prize').setDescription('Prize').setRequired(true))
        .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const duration = interaction.options.getString('duration');
        const prize = interaction.options.getString('prize');
        const winners = interaction.options.getInteger('winners') || 1;
        await this.handleGstart(interaction, duration, prize, winners);
    },
    async messageRun(message, args) {
        const hasPermission = await hasStaffPermission(message.member) || message.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!hasPermission) {
            return this.replyError(message, 'You do not have permission to manage server.');
        }
        if (args.length < 2) {
            const prefix = await getPrefix(message.guild.id);
            const embed = createSuccessEmbed('Start Giveaway',
                `> **Usage:** \`${prefix}gstart <duration> <prize>\`\n> **Example:** \`${prefix}gstart 1h Discord Nitro\`\n\n` +
                `${ICONS.POINT} Duration: \`1m\`, \`1h\`, \`1d\``
            );
            return message.reply({ embeds: [embed] });
        }
        const duration = args[0];
        const prize = args.slice(1).join(' ');
        await this.handleGstart(message, duration, prize, 1);
    },
    async handleGstart(source, durationStr, prize, winnerCount) {
        // Parse duration using helper
        const duration = parseTime(durationStr);

        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        if (!duration) {
            const embed = createErrorEmbed('Invalid duration format\n\n' + `${ICONS.POINT} Use: \`m\` (minutes), \`h\` (hours), \`d\` (days)`);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const endTime = new Date(Date.now() + duration);
        const host = source.user || source.author;

        // Create giveaway embed
        const giveawayEmbed = new EmbedBuilder()
            .setTitle(`${ICONS.GIFT} **GIVEAWAY**`)
            .setDescription(
                `> **Prize:** ${prize}\n` +
                `> **Hosted by:** ${host}\n` +
                `> **Winners:** ${winnerCount}\n` +
                `> **Ends:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n` +
                `${ICONS.POINT} React with 🎉 to enter!`
            )
            .setColor(0x2B2D31)
            .setFooter({ text: `Ends at` })
            .setTimestamp(endTime);

        const channel = source.channel;
        const giveawayMessage = await channel.send({ embeds: [giveawayEmbed] });
        await giveawayMessage.react('🎉');

        // Save to database
        try {
            const giveaway = new Giveaway({
                guildId: source.guild.id,
                channelId: channel.id,
                messageId: giveawayMessage.id,
                prize: prize,
                hostId: host.id,
                endTime: endTime,
                winnerCount: winnerCount,
                participants: [],
                status: 'active'
            });

            await giveaway.save();

            // Delete the command message if it's from message command
            if (source.author && source.delete) {
                await source.delete().catch(() => { });
            } else if (source.reply) {
                // For slash commands, send ephemeral confirmation
                await source.reply({ content: `${ICONS.CHECKMARK} Giveaway started!`, ephemeral: true });
            }
        } catch (error) {
            console.error('Error creating giveaway:', error);
            const errorEmbed = createErrorEmbed('Failed to create giveaway\n\n' + `${ICONS.POINT} Please try again`);
            if (source.reply) await source.reply({ embeds: [errorEmbed], ephemeral: true });
            else await source.channel.send({ embeds: [errorEmbed] });
        }
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed], ephemeral: true });
    }
};











