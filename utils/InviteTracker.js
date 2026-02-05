const { Collection } = require('discord.js');
const Invite = require('../models/Invite');

class InviteTracker {
    constructor(client) {
        this.client = client;
        this.invites = new Collection(); // Cache: guildId -> Collection(code -> invite)
    }

    /**
     * Initialize the tracker by fetching all invites from all guilds
     */
    async init() {
        let successCount = 0;
        for (const [guildId, guild] of this.client.guilds.cache) {
            try {
                const botMember = guild.members.me;
                if (!botMember?.permissions.has(['ManageGuild', 'ManageChannels'])) continue;

                const invites = await guild.invites.fetch();
                const codeMap = new Collection();
                invites.each(inv => codeMap.set(inv.code, inv.uses));
                this.invites.set(guildId, codeMap);
                successCount++;
            } catch (err) {
                // Silently fail for guilds where bot lacks permissions
            }
        }
    }

    /**
     * Handle a new member joining
     */
    async handleJoin(member) {
        const guildId = member.guild.id;
        const cachedInvites = this.invites.get(guildId);

        try {
            const newInvites = await member.guild.invites.fetch();

            // Find the invite that was used
            const usedInvite = newInvites.find(inv => {
                const cachedUses = cachedInvites?.get(inv.code) || 0;
                return inv.uses > cachedUses;
            });

            // Update cache
            const codeMap = new Collection();
            newInvites.each(inv => codeMap.set(inv.code, inv.uses));
            this.invites.set(guildId, codeMap);

            if (!usedInvite) {
                console.log(`User ${member.user.tag} joined but no invite could be tracked (possibly vanity URL or bot).`);
                return null;
            }

            const inviterId = usedInvite.inviter?.id;
            if (!inviterId) return null;

            // Update inviter stats in DB
            let inviteData = await Invite.findOne({ guildId, userId: inviterId });
            if (!inviteData) {
                inviteData = new Invite({ guildId, userId: inviterId });
            }

            // Check for fake invites (account age < 3 days)
            const isFake = (Date.now() - member.user.createdTimestamp) < (1000 * 60 * 60 * 24 * 3);

            // Check for Rejoin
            const LeftRole = require('../models/LeftRole');
            const previousLeave = await LeftRole.findOne({ guildId, userId: member.id });

            if (previousLeave) {
                inviteData.rejoins += 1;
            } else if (isFake) {
                inviteData.fake += 1;
            } else {
                inviteData.regular += 1;
            }

            inviteData.total = (inviteData.regular + inviteData.rejoins) - inviteData.leaves;
            await inviteData.save();

            // Store who invited this member (so we can look up later)
            let memberInviteData = await Invite.findOne({ guildId, userId: member.id });
            if (!memberInviteData) {
                memberInviteData = new Invite({ guildId, userId: member.id });
            }
            memberInviteData.inviterId = inviterId;
            await memberInviteData.save();

            return { inviter: usedInvite.inviter, code: usedInvite.code, isFake };

        } catch (err) {
            console.error('Error handling join:', err);
            return null;
        }
    }

    /**
     * Handle a member leaving
     */
    async handleLeave(member) {
        const guildId = member.guild.id;

        try {
            // Find who invited this member
            const memberData = await Invite.findOne({ guildId, userId: member.id });

            if (memberData && memberData.inviterId) {
                // Decrement the inviter's stats
                const inviterData = await Invite.findOne({ guildId, userId: memberData.inviterId });

                if (inviterData) {
                    inviterData.leaves += 1;
                    inviterData.total = (inviterData.regular + inviterData.rejoins + (inviterData.bonus || 0)) - inviterData.leaves;
                    await inviterData.save();

                    console.log(`[Invites] ${member.user.tag} left. Decremented invite for inviter ${memberData.inviterId}`);
                }
            }

            // Mark this user as having left (for rejoin tracking)
            const LeftRole = require('../models/LeftRole');
            await LeftRole.findOneAndUpdate(
                { guildId, userId: member.id },
                { leftAt: new Date() },
                { upsert: true }
            );

        } catch (err) {
            console.error('Error handling leave for invites:', err);
        }
    }
}

module.exports = InviteTracker;



