const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Invite = require('../../models/Invite');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetinvites')
        .setDescription('Resetea las invitaciones bonus')
        .addUserOption(o => o.setName('user').setDescription('Usuario (solo staff/admin)').setRequired(false)),

    aliases: ['rmi'],

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        await this.handleReset(interaction, targetUser);
    },

    async messageRun(message, args) {
        const targetUser = message.mentions.users.first();
        await this.handleReset(message, targetUser);
    },

    async handleReset(source, targetUser) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const executor = source.user || source.author;
        const isAdmin = source.member.permissions.has(PermissionFlagsBits.Administrator);

        // Check for staff role
        let isStaff = false;
        try {
            const staffRoleDoc = await StaffRole.findOne({ guildId: source.guild.id });
            if (staffRoleDoc && source.member.roles.cache.has(staffRoleDoc.roleId)) {
                isStaff = true;
            }
        } catch { }

        // If target user specified, must be admin or staff
        if (targetUser) {
            if (!isAdmin && !isStaff) {
                return reply({
                    content: `${DISCO_ICONS.CROSSMARK} Solo staff/admin pueden resetear invitaciones de otros usuarios.`,
                    ephemeral: true
                });
            }
        }

        // User to reset (self if no target specified)
        const userToReset = targetUser || executor;

        try {
            const result = await Invite.findOneAndUpdate(
                { guildId: source.guild.id, userId: userToReset.id },
                { $set: { bonus: 0 } },
                { new: true }
            );

            // Recalculate total
            if (result) {
                const newTotal = (result.regular || 0) + (result.rejoins || 0) - (result.leaves || 0);
                await Invite.updateOne(
                    { _id: result._id },
                    { $set: { total: newTotal } }
                );
            }

            const embed = new EmbedBuilder()
                .setDescription(
                    `${DISCO_ICONS.CHECKMARK} **Invitaciones Reseteadas**\n\n` +
                    `<a:15136blackdot:1448143887699804252> **Usuario:** ${userToReset}\n` +
                    `<a:15136blackdot:1448143887699804252> **Bonus reseteado a:** 0\n` +
                    (targetUser ? `<a:15136blackdot:1448143887699804252> **Por:** ${executor}` : '')
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (e) {
            console.error('Error resetting invites:', e);
            await reply({ content: `${DISCO_ICONS.CROSSMARK} Error al resetear invitaciones.`, ephemeral: true });
        }
    }
};
