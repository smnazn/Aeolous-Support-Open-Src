const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Provides information about the user.')
        .addUserOption(option => option.setName('target').setDescription('The user').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch({ user: user.id, force: true });

        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => `<@&${role.id}>`)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.MEMBER} ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: `${DISCO_ICONS.MEMBER} User ID`, value: user.id, inline: false },
                { name: `${DISCO_ICONS.BOOSTER} Server Booster`, value: member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : 'No', inline: false },
                { name: `${DISCO_ICONS.INFO} Joined Server`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false },
                { name: `${DISCO_ICONS.INFO} Account Created`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
                { name: `${DISCO_ICONS.INFO} Nickname`, value: member.nickname || 'None', inline: false },
                { name: `${DISCO_ICONS.INFO} Roles [${member.roles.cache.size - 1}]`, value: roles.length > 0 ? roles.join(', ') : 'None', inline: false }
            )
            .setColor(member.displayHexColor !== '#000000' ? member.displayHexColor : 0x2B2D31)
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.reply({ embeds: [embed] });
    },
    async messageRun(message, args) {
        let user;

        // Check if mention
        if (message.mentions.users.first()) {
            user = message.mentions.users.first();
        }
        // Check if user ID
        else if (args[0] && /^\d{17,19}$/.test(args[0])) {
            try {
                user = await message.client.users.fetch(args[0]);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.CROSSMARK} User not found`)
                    .setColor(0x2B2D31);
                return message.reply({ embeds: [embed] });
            }
        }
        // Default to message author
        else {
            user = message.author;
        }

        const member = await message.guild.members.fetch({ user: user.id, force: true }).catch(() => null);

        if (!member) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} User is not in this server`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const roles = member.roles.cache
            .filter(role => role.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => `<@&${role.id}>`)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.MEMBER} ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: `${DISCO_ICONS.MEMBER} User ID`, value: user.id, inline: false },
                { name: `${DISCO_ICONS.BOOSTER} Server Booster`, value: member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : 'No', inline: false },
                { name: `${DISCO_ICONS.INFO} Joined Server`, value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false },
                { name: `${DISCO_ICONS.INFO} Account Created`, value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
                { name: `${DISCO_ICONS.INFO} Nickname`, value: member.nickname || 'None', inline: false },
                { name: `${DISCO_ICONS.INFO} Roles [${member.roles.cache.size - 1}]`, value: roles.length > 0 ? roles.join(', ') : 'None', inline: false }
            )
            .setColor(member.displayHexColor !== '#000000' ? member.displayHexColor : 0x2B2D31)
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
        await message.reply({ embeds: [embed] });
    }
};









