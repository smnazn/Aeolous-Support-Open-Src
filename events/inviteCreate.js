const { Events } = require('discord.js');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite) {
        try {
            if (!invite.client.inviteTracker) return;

            const guildId = invite.guild.id;
            const cachedInvites = invite.client.inviteTracker.invites.get(guildId);

            if (cachedInvites) {
                cachedInvites.set(invite.code, invite.uses);
                console.log(`Invite created: ${invite.code} by ${invite.inviter?.tag}`);
            }
        } catch (error) {
            console.error('Error handling invite create:', error);
        }
    },
};





