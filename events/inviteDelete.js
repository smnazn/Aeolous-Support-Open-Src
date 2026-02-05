const { Events } = require('discord.js');

module.exports = {
    name: Events.InviteDelete,
    async execute(invite) {
        try {
            if (!invite.client.inviteTracker) return;

            const guildId = invite.guild.id;
            const cachedInvites = invite.client.inviteTracker.invites.get(guildId);

            if (cachedInvites) {
                cachedInvites.delete(invite.code);
                console.log(`Invite deleted: ${invite.code}`);
            }
        } catch (error) {
            console.error('Error handling invite delete:', error);
        }
    },
};





