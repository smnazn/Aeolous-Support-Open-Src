const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const LeftRole = require('../../models/LeftRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leftroles')
        .setDescription('View and restore roles for a user who left the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check left roles for')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        await this.handleLeftRoles(interaction, user);
    },
    async messageRun(message, args) {
        const user = message.mentions.users.first();
        if (!user) {
            const embed = new EmbedBuilder()
                .setDescription('<:warning:1448832070628671488> Please mention a user.\n\n**Usage:** `.leftroles <@user>`')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        await this.handleLeftRoles(message, user);
    },
    async handleLeftRoles(source, user) {
        const guild = source.guild;

        try {
            // Find saved roles for this user
            const leftRole = await LeftRole.findOne({
                guildId: guild.id,
                userId: user.id
            });

            if (!leftRole || leftRole.roles.length === 0) {
                const embed = new EmbedBuilder()
                    .setDescription(`<:warning:1448832070628671488> No saved roles found for **${user.tag}**`)
                    .setColor(0x2B2D31);

                if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
                else await source.channel.send({ embeds: [embed] });
                return;
            }

            // Get role names
            const roleList = leftRole.roles
                .map(roleId => {
                    const role = guild.roles.cache.get(roleId);
                    return role ? `<@&${roleId}>` : `~~Deleted Role (${roleId})~~`;
                })
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Left Roles for ${user.tag}`)
                .setDescription(
                    `<a:15136blackdot:1448143887699804252> **User:** ${user}\n` +
                    `<a:15136blackdot:1448143887699804252> **Left At:** <t:${Math.floor(leftRole.leftAt.getTime() / 1000)}:R>\n` +
                    `<a:15136blackdot:1448143887699804252> **Roles (${leftRole.roles.length}):**\n${roleList}`
                )
                .setColor(0x2B2D31)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));

            // Check if user is back in the server
            const member = await guild.members.fetch(user.id).catch(() => null);

            if (member) {
                const button = new ButtonBuilder()
                    .setCustomId(`restore_roles_${user.id}`)
                    .setLabel('Restore Roles')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄');

                const row = new ActionRowBuilder().addComponents(button);

                let response;
                if (source.reply) {
                    response = await source.reply({ embeds: [embed], components: [row], fetchReply: true });
                } else {
                    response = await source.channel.send({ embeds: [embed], components: [row] });
                }

                // Button collector
                const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 minutes

                collector.on('collect', async i => {
                    if (!i.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                        return i.reply({ content: '<:deny:1448831817963536506> You need Manage Roles permission to restore roles.', ephemeral: true });
                    }

                    await i.deferUpdate();

                    try {
                        const rolesToAdd = leftRole.roles.filter(roleId => {
                            const role = guild.roles.cache.get(roleId);
                            return role && !member.roles.cache.has(roleId);
                        });

                        if (rolesToAdd.length > 0) {
                            await member.roles.add(rolesToAdd);

                            const successEmbed = new EmbedBuilder()
                                .setDescription(`<a:green_check1367494810885292092:1448142485460353054> Successfully restored **${rolesToAdd.length}** roles to ${user}`)
                                .setColor(0x2B2D31);

                            await i.followUp({ embeds: [successEmbed], ephemeral: true });

                            // Disable button
                            button.setDisabled(true);
                            await response.edit({ components: [row] });
                        } else {
                            await i.followUp({ content: `${DISCO_ICONS.INFO} User already has all saved roles.`, ephemeral: true });
                        }
                    } catch (error) {
                        console.error('Error restoring roles:', error);
                        await i.followUp({ content: '<:deny:1448831817963536506> Failed to restore roles. Make sure the bot has proper permissions.', ephemeral: true });
                    }
                });

                collector.on('end', () => {
                    button.setDisabled(true);
                    response.edit({ components: [row] }).catch(() => { });
                });
            } else {
                if (source.reply) await source.reply({ embeds: [embed] });
                else await source.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error fetching left roles:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} An error occurred while fetching left roles.`)
                .setColor(0x2B2D31);

            if (source.reply) await source.reply({ embeds: [embed], ephemeral: true });
            else await source.channel.send({ embeds: [embed] });
        }
    }
};












