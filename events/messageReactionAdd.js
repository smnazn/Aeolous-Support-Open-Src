const { Events } = require('discord.js');
const ReactionRole = require('../models/ReactionRole');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;

        // Partial handling
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }

        try {
            const { message, emoji } = reaction;
            const emojiName = emoji.id ? emoji.id : emoji.name; // Use ID for custom, name for unicode

            // --- Reaction Role Logic ---
            const rr = await ReactionRole.findOne({
                messageId: message.id,
                $or: [{ emoji: emojiName }, { emoji: emoji.toString() }]
            });

            if (rr) {
                const guild = message.guild;
                const member = await guild.members.fetch(user.id);
                const role = guild.roles.cache.get(rr.roleId);

                if (role && member) {
                    await member.roles.add(role);
                }
            }

            // --- Giveaway Logic ---
            if (emoji.name === '🎉') {
                const Giveaway = require('../models/Giveaway');
                const giveaway = await Giveaway.findOne({ messageId: message.id, status: 'active' });

                if (giveaway) {
                    await Giveaway.updateOne(
                        { _id: giveaway._id },
                        { $addToSet: { participants: user.id } }
                    );
                    // console.log(`Added ${user.tag} to giveaway ${giveaway._id}`);
                }
            }

        } catch (error) {
            console.error('Error in messageReactionAdd:', error);
        }
    },
};





