const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setnick')
        .setDescription('Change a user\'s nickname (Manage Nicknames permission required).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to change nickname for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('The new nickname (leave empty to reset)')
                .setRequired(false)),
    async execute(interaction) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(interaction.user.id);
        if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> You need Manage Nicknames permission to use this command.')
                .setColor(0x2B2D31);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        const member = await interaction.guild.members.fetch(user.id);

        try {
            await member.setNickname(nickname);

            const embed = new EmbedBuilder()
                .setDescription(
                    nickname
                        ? `<a:green_check1367494810885292092:1448142485460353054> Successfully changed **${user.tag}**'s nickname to **${nickname}**`
                        : `<a:green_check1367494810885292092:1448142485460353054> Successfully reset **${user.tag}**'s nickname`
                )
                .setColor(0x2B2D31);
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting nickname:', error);
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> Failed to change nickname. Make sure the bot has proper permissions and the user is not higher in role hierarchy.')
                .setColor(0x2B2D31);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
    async messageRun(message, args) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> You need Manage Nicknames permission to use this command.')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const user = message.mentions.users.first();
        if (!user) {
            const embed = new EmbedBuilder()
                .setDescription('<:warning:1448832070628671488> Please mention a user.\n\n**Usage:** `.setnick <@user> <nickname>` or `.setnick <@user>` to reset')
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        // Get nickname from args (everything after the mention)
        const nickname = args.slice(1).join(' ') || null;
        const member = await message.guild.members.fetch(user.id);

        try {
            await member.setNickname(nickname);

            const embed = new EmbedBuilder()
                .setDescription(
                    nickname
                        ? `<a:green_check1367494810885292092:1448142485460353054> Successfully changed **${user.tag}**'s nickname to **${nickname}**`
                        : `<a:green_check1367494810885292092:1448142485460353054> Successfully reset **${user.tag}**'s nickname`
                )
                .setColor(0x2B2D31);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting nickname:', error);
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> Failed to change nickname. Make sure the bot has proper permissions and the user is not higher in role hierarchy.')
                .setColor(0x2B2D31);
            await message.reply({ embeds: [embed] });
        }
    }
};












