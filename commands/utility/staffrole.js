const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, ICONS } = require('../../utils/helpers');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staffrole')
        .setDescription('Configure staff role for bot permissions')
        .addSubcommand(sub =>
            sub.setName('set').setDescription('Set the staff role')
                .addRoleOption(opt => opt.setName('role').setDescription('Staff role').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove').setDescription('Remove staff role configuration'))
        .addSubcommand(sub =>
            sub.setName('view').setDescription('View current staff role'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        await this.handleStaffRole(interaction, sub, interaction.options);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return this.replyError(message, 'You need Administrator permission.');
        }

        if (args.length === 0) {
            const embed = createSuccessEmbed('Staff Role',
                '> **Usage:**\n' +
                '> `.staffrole set <@role>`\n' +
                '> `.staffrole remove`\n' +
                '> `.staffrole view`\n\n' +
                `${ICONS.POINT} Configure staff role for giveaways and moderation`
            );
            return message.reply({ embeds: [embed] });
        }

        const sub = args[0].toLowerCase();
        await this.handleStaffRole(message, sub, args.slice(1));
    },

    async handleStaffRole(source, sub, options) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        switch (sub) {
            case 'set': {
                const role = options.getRole ? options.getRole('role') : source.mentions.roles.first();
                if (!role) {
                    const embed = createErrorEmbed('Please mention a role');
                    return reply({ embeds: [embed] });
                }

                await StaffRole.findOneAndUpdate(
                    { guildId: source.guild.id },
                    { roleId: role.id },
                    { upsert: true, new: true }
                );

                const embed = createSuccessEmbed('Staff Role Set',
                    `> **Role:** ${role}\n\n${ICONS.POINT} Members with this role can manage giveaways and use staff commands`
                );

                await reply({ embeds: [embed] });
                break;
            }

            case 'remove': {
                await StaffRole.deleteOne({ guildId: source.guild.id });

                const embed = createSuccessEmbed('Staff Role Removed',
                    '> **Staff role configuration has been removed**'
                );

                await reply({ embeds: [embed] });
                break;
            }

            case 'view': {
                const staffRole = await StaffRole.findOne({ guildId: source.guild.id });

                const embed = createSuccessEmbed('Staff Role',
                    staffRole
                        ? `> **Status:** \`CONFIGURED\`\n> **Role:** <@&${staffRole.roleId}>`
                        : '> **Status:** `NOT CONFIGURED`'
                );

                await reply({ embeds: [embed] });
                break;
            }

            default: {
                const embed = createErrorEmbed('Invalid subcommand');
                await reply({ embeds: [embed] });
            }
        }
    },

    async getStaffRole(guildId) {
        const staffRole = await StaffRole.findOne({ guildId });
        return staffRole ? staffRole.roleId : null;
    },

    async hasStaffRole(member) {
        const staffRole = await StaffRole.findOne({ guildId: member.guild.id });
        if (!staffRole) return false;
        return member.roles.cache.has(staffRole.roleId) || member.permissions.has(PermissionFlagsBits.Administrator);
    },

    async replyError(source, message) {
        const embed = createErrorEmbed(message);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        await reply({ embeds: [embed] }); // staffrole errors usually public if usage error, but consistency suggests helpers use logic. Here we just return embed.
    }
};











