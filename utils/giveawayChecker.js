const Giveaway = require('../models/Giveaway');
const { EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('./icons');

async function checkGiveaways(client) {
    try {
        const now = new Date();
        const expiredGiveaways = await Giveaway.find({
            status: 'active',
            endTime: { $lte: now }
        });

        for (const giveaway of expiredGiveaways) {
            await endGiveaway(client, giveaway);
        }
    } catch (error) {
        console.error('Error checking giveaways:', error);
    }
}

async function endGiveaway(client, giveaway) {
    try {
        const guild = client.guilds.cache.get(giveaway.guildId);
        if (!guild) {
            giveaway.status = 'ended';
            await giveaway.save();
            return;
        }

        const channel = guild.channels.cache.get(giveaway.channelId);
        if (!channel) {
            giveaway.status = 'ended';
            await giveaway.save();
            return;
        }

        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!message) {
            giveaway.status = 'ended';
            await giveaway.save();
            return;
        }

        const reaction = message.reactions.cache.get('🎉');
        let participants = [];

        if (reaction) {
            const users = await reaction.users.fetch();
            participants = users.filter(user => !user.bot).map(user => user.id);
        }

        if (participants.length === 0) {
            const noWinnerEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.REMINDER} Giveaway Ended`)
                .setDescription(`${DISCO_ICONS.POINT} **Prize:** \`${giveaway.prize}\`\n\n${DISCO_ICONS.POINT} No valid participants`)
                .setColor(0x2B2D31);

            await message.edit({ embeds: [noWinnerEmbed] });
            giveaway.status = 'ended';
            await giveaway.save();
            return;
        }

        const winnerCount = Math.min(giveaway.winnerCount || 1, participants.length);
        const winners = [];
        const participantsCopy = [...participants];

        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * participantsCopy.length);
            winners.push(participantsCopy.splice(randomIndex, 1)[0]);
        }

        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

        const endedEmbed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.REMINDER} Giveaway Ended`)
            .setDescription(`${DISCO_ICONS.POINT} **Prize:** \`${giveaway.prize}\`\n${DISCO_ICONS.POINT} **Winner(s):** ${winnerMentions}`)
            .setColor(0x2B2D31);

        await message.edit({ embeds: [endedEmbed] });

        // Calculate claim time
        const firstWinner = winners[0];
        const member = await guild.members.fetch(firstWinner).catch(() => null);
        let claimTime = giveaway.defaultClaimTime || 10;

        if (member && giveaway.claimTimeRoles && giveaway.claimTimeRoles.length > 0) {
            for (const roleTime of giveaway.claimTimeRoles) {
                if (member.roles.cache.has(roleTime.roleId)) {
                    claimTime = Math.max(claimTime, roleTime.seconds);
                }
            }
        }

        const claimStartTime = new Date();
        const claimDeadline = new Date(claimStartTime.getTime() + claimTime * 1000);

        giveaway.claimStartTime = claimStartTime;
        giveaway.claimDeadline = claimDeadline;
        giveaway.status = 'ended';
        giveaway.winners = winners;
        await giveaway.save();

        const host = await client.users.fetch(giveaway.hostId).catch(() => null);
        const hostMention = host ? `<@${giveaway.hostId}>` : 'the host';

        const winnerMessage =
            `🎉 **FELICIDADES** 🎉\n\n` +
            `${DISCO_ICONS.POINT} **¡Haz Ganado El Sorteo!**\n` +
            `${DISCO_ICONS.POINT} **Felicidades ${winnerMentions}**\n` +
            `${DISCO_ICONS.POINT} **Tienes ${claimTime}s Para Reclamar**\n` +
            `${DISCO_ICONS.POINT} **Reclama Al DM De ${hostMention}**\n\n` +
            `**¡Haz ganado!**`;

        const reply = await message.reply({ content: winnerMessage });

        // Set timeout to notify when claim time expires
        setTimeout(async () => {
            try {
                const timeoutMessage = `<:reminder:1448489924083843092> **${claimTime} segundos terminados para ${winnerMentions}**`;
                await reply.reply({ content: timeoutMessage });
            } catch (error) {
                console.error('Error sending timeout notification:', error);
            }
        }, claimTime * 1000);

    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}

module.exports = { checkGiveaways, endGiveaway };



