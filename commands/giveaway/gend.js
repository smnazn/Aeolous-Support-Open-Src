const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Giveaway = require('../../models/Giveaway');
const { endGiveaway } = require('../../utils/giveawayChecker');
const { hasStaffPermission } = require('../../utils/staffPermissions');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gend')
        .setDescription('End the active giveaway in this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await this.handleGend(interaction);
    },
    async messageRun(message, args) {
        const hasPermission = await hasStaffPermission(message.member) || message.member.permissions.has(PermissionFlagsBits.ManageGuild);
        if (!hasPermission) {
            return this.replyError(message, 'You do not have permission to manage server.');
        }
        await this.handleGend(message);
    },
    async handleGend(source) {
        try {
            // Find active giveaway in this channel
            const giveaway = await Giveaway.findOne({
                channelId: source.channel.id,
                guildId: source.guild.id,
                status: 'active'
            }).sort({ createdAt: -1 }); // Get most recent

            // Fallback: Check reactions if participants empty (for old giveaways)
            if (giveaway && (!giveaway.participants || giveaway.participants.length === 0)) {
                try {
                    const channel = await source.guild.channels.fetch(giveaway.channelId);
                    if (channel) {
                        const msg = await channel.messages.fetch(giveaway.messageId);
                        if (msg) {
                            const reaction = msg.reactions.cache.get('🎉');
                            if (reaction) {
                                const users = await reaction.users.fetch();
                                giveaway.participants = users.filter(u => !u.bot).map(u => u.id);
                                await giveaway.save();
                            }
                        }
                    }
                } catch (err) {
                    console.log("Could not fetch reactions for fallback in gend:", err);
                }
            }

            const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

            if (!giveaway) {
                const embed = createErrorEmbed('No active giveaway found in this channel');
                return reply({ embeds: [embed], ephemeral: true });
            }

            await endGiveaway(source.client, giveaway);



        } catch (error) {
            console.error('Error ending giveaway:', error);
            const errorEmbed = createErrorEmbed('Failed to end giveaway');
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











