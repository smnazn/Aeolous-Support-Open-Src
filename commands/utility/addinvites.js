const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Invite = require('../../models/Invite');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addinvites')
        .setDescription('Add regular invites to a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction) {
        const hasPermission = await this.checkPermission(interaction.member, interaction.guild);
        if (!hasPermission) {
            return interaction.reply({ content: 'No tienes permisos de Administrador ni rol de Staff.', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        await this.handleAdd(interaction, user, amount);
    },

async messageRun(message, args) {
        const hasPermission = await this.checkPermission(message.member, message.guild);
        if (!hasPermission) return;
        const user = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (user && !isNaN(amount)) {
            await this.handleAdd(message, user, amount);
        } else {
            message.reply('Uso: .addinvites <user> <amount>');
        }
    },

async handleAdd(source, user, amount) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        try {
            const doc = await Invite.findOneAndUpdate(
                { guildId: source.guild.id, userId: user.id },
                { $inc: { regular: amount } },
                { upsert: true, new: true }
            );
            await Invite.updateOne({ _id: doc._id }, { $inc: { total: amount } });
            await reply({ content: `${DISCO_ICONS.CHECKMARK} Se han añadido **${amount}** invitaciones (Regular) a ${user.tag}.`, ephemeral: true });
        } catch (e) {
            await reply({ content: `Error: ${e.message}`, ephemeral: true });
        }
    },

    async checkPermission(member, guild) {
        // 1. Verificar permisos de Administrador
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }
        
        // 2. Verificar rol de staff configurado
        try {
            const staffRole = await StaffRole.findOne({ guildId: guild.id });
            if (staffRole && member.roles.cache.has(staffRole.roleId)) {
                return true;
            }
        } catch (e) {
            console.error('Error checking staff role:', e);
        }
        
        return false;
    }
};












