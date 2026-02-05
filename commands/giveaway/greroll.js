const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Giveaway = require('../../models/Giveaway');
const { hasStaffPermission } = require('../../utils/staffPermissions');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('greroll')
        .setDescription('Reroll a giveaway winner.')
        .addStringOption(option => option.setName('messageid').setDescription('Giveaway message ID (Optional)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const messageId = interaction.options.getString('messageid');
        await this.handleGreroll(interaction, messageId);
    },
    async messageRun(message, args) {
        const hasPermission = await hasStaffPermission(message.member) || message.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!hasPermission) {
            return this.replyError(message, 'You do not have permission to manage server.');
        }
        const messageId = args.length > 0 ? args[0] : null;
        await this.handleGreroll(message, messageId);
    },
    async handleGreroll(source, messageId) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            let giveaway;
            if (messageId) {
                giveaway = await Giveaway.findOne({
                    messageId: messageId,
                    guildId: source.guild.id,
                    status: 'ended'
                });
            } else {
                giveaway = await Giveaway.findOne({
                    channelId: source.channel.id,
                    guildId: source.guild.id,
                    status: 'ended'
                }).sort({ endedAt: -1 }); // Get most recently ended
            }

            if (!giveaway) {
                const embed = createErrorEmbed('Giveaway not found or not ended');
                return reply({ embeds: [embed], ephemeral: true });
            }

            if (giveaway.participants.length === 0) {
                // Fallback: If no participants in DB, try to fetch from message reactions
                try {
                    const channel = await source.guild.channels.fetch(giveaway.channelId);
                    if (channel) {
                        const message = await channel.messages.fetch(giveaway.messageId);
                        if (message) {
                            const reaction = message.reactions.cache.get('🎉');
                            if (reaction) {
                                const users = await reaction.users.fetch();
                                giveaway.participants = users.filter(u => !u.bot).map(u => u.id);
                                await giveaway.save();
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch reactions for reroll backup:", err);
                }
            }

            if (giveaway.participants.length === 0) {
                const embed = createErrorEmbed('No participants to reroll');
                return reply({ embeds: [embed], ephemeral: true });
            }

            // Select new winner
            const winnerId = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
            giveaway.winnerId = winnerId;
            giveaway.winners = [winnerId];
            await giveaway.save();

            const winner = await source.client.users.fetch(winnerId).catch(() => null);
            const guild = source.guild;

            // Calculate claim time
            const member = await guild.members.fetch(winnerId).catch(() => null);
            let claimTime = giveaway.defaultClaimTime || 10;

            if (member && giveaway.claimTimeRoles && giveaway.claimTimeRoles.length > 0) {
                for (const roleTime of giveaway.claimTimeRoles) {
                    if (member.roles.cache.has(roleTime.roleId)) {
                        claimTime = Math.max(claimTime, roleTime.seconds);
                    }
                }
            }

            const host = await source.client.users.fetch(giveaway.hostId).catch(() => null);
            const hostMention = host ? `<@${giveaway.hostId}>` : 'the host';

            const winnerMessage =
                `🎉 **FELICIDADES** 🎉\n\n` +
                `${ICONS.POINT} **¡Haz Ganado El Sorteo! (Reroll)**\n` +
                `${ICONS.POINT} **Felicidades <@${winnerId}>**\n` +
                `${ICONS.POINT} **Tienes ${claimTime}s Para Reclamar**\n` +
                `${ICONS.POINT} **Reclama Al DM De ${hostMention}**\n\n` +
                `**¡Haz ganado ${giveaway.prize}!**`;

            const replyMsg = await reply({ content: winnerMessage, fetchReply: true });

            // Set timeout to notify when claim time expires
            setTimeout(async () => {
                try {
                    const timeoutMessage = `<:reminder:1448489924083843092> **${claimTime} segundos terminados para <@${winnerId}>**`;
                    await replyMsg.reply({ content: timeoutMessage });
                } catch (error) {
                    console.error('Error sending timeout notification:', error);
                }
            }, claimTime * 1000);

        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            const errorEmbed = createErrorEmbed('Failed to reroll giveaway');
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












