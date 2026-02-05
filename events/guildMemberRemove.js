const { Events } = require('discord.js');
const LeftRole = require('../models/LeftRole');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Handle invite tracking - decrement inviter's invites
        try {
            if (member.client.inviteTracker) {
                await member.client.inviteTracker.handleLeave(member);
            }
        } catch (error) {
            console.error('Error in guildMemberRemove invite tracking:', error);
        }

        try {
            // Save user's roles before they leave
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id) // Exclude @everyone role
                .map(role => role.id);

            if (roles.length > 0) {
                await LeftRole.findOneAndUpdate(
                    { guildId: member.guild.id, userId: member.user.id },
                    {
                        guildId: member.guild.id,
                        userId: member.user.id,
                        username: member.user.tag,
                        roles: roles,
                        leftAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                console.log(`Saved ${roles.length} roles for ${member.user.tag} in ${member.guild.name}`);
            }
        } catch (error) {
            console.error('Error saving left roles:', error);
        }
    },
};





