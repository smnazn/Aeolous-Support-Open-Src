const { Events, EmbedBuilder } = require('discord.js');
const Autorole = require('../models/Autorole');
const InviteTracker = require('../utils/InviteTracker');
const { DISCO_ICONS } = require('../utils/icons');

// We need a global instance or singleton for the tracker. 
// For simplicity, we'll instantiate it here, but ideally it should be on the client.
// Since events are loaded once, we can attach it to the client in index.js, but let's check if we can access client here.

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // --- Automated Welcome ---
        try {
            const WelcomeConfig = require('../models/WelcomeConfig');
            const config = await WelcomeConfig.findOne({ guildId: member.guild.id });

            if (config && config.enabled && config.channelId) {
                const channel = member.guild.channels.cache.get(config.channelId);
                if (channel) {
                    const guild = member.guild;

                    // Get custom message or use default
                    let customMessage = config.message || 'Welcome to {server}! We\'re glad to have you here.';
                    customMessage = customMessage
                        .replace(/{user}/g, member.toString())
                        .replace(/{username}/g, member.user.username)
                        .replace(/{tag}/g, member.user.tag)
                        .replace(/{server}/g, guild.name)
                        .replace(/{membercount}/g, guild.memberCount.toString());

                    // Create welcome embed with custom message
                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle(`Welcome to ${guild.name}!`)
                        .setDescription(`${DISCO_ICONS.POINT} ${customMessage}\n\n${DISCO_ICONS.POINT} You are member **#${guild.memberCount}**`)
                        .setThumbnail(member.user.displayAvatarURL({ size: 256, dynamic: true }))
                        .setFooter({
                            text: `${guild.name} • ${new Date().toLocaleDateString()}`,
                            iconURL: guild.iconURL()
                        })
                        .setTimestamp();

                    // Send mention first, then embed
                    await channel.send({
                        content: `${DISCO_ICONS.SUCCESS} Welcome ${member}!`,
                        embeds: [embed]
                    });
                }
            }
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }

        // --- Autorole Logic ---
        try {
            const autoroleConfig = await Autorole.findOne({ guildId: member.guild.id });
            if (autoroleConfig && autoroleConfig.roleIds && autoroleConfig.roleIds.length > 0) {
                for (const roleId of autoroleConfig.roleIds) {
                    const role = member.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(role);
                        console.log(`Assigned autorole ${role.name} to ${member.user.tag}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error assigning autorole:', error);
        }

        // --- Invite Tracking Logic ---
        try {
            // Ensure client has tracker
            if (!member.client.inviteTracker) {
                member.client.inviteTracker = new InviteTracker(member.client);
                // Initial init might be needed if not done in index.js
                // But for now, let's assume we'll add it to index.js
            }

            const inviteData = await member.client.inviteTracker.handleJoin(member);

            if (inviteData) {
                const { inviter, code, isFake } = inviteData;
                console.log(`User ${member.user.tag} invited by ${inviter.tag} using code ${code}.Fake: ${isFake}`);

                // Optional: Send welcome message with invite info
                // const channel = member.guild.systemChannel;
                // if (channel) channel.send(`Welcome ${ member }, invited by ${ inviter.tag } (${ inviteData.uses } uses) !`);
            }
        } catch (error) {
            console.error('Error tracking invite:', error);
        }
    },
};




