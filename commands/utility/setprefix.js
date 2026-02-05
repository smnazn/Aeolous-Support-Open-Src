const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Changes the bot prefix for this server (Administrator only).')
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('The new prefix to set')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> You need Administrator permission to change the prefix.')
                .setColor(0x2B2D31);
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const newPrefix = interaction.options.getString('prefix');
        await setGuildConfig(interaction.guild.id, 'prefix', newPrefix);

        const embed = new EmbedBuilder()
            .setDescription(`<:checkmark:1448832045068583033> Prefix changed to \`${newPrefix}\` for this server.`)
            .setColor(0x2B2D31);
        await interaction.reply({ embeds: [embed] });
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> You need Administrator permission to change the prefix.')
                .setColor(0x2B2D31);
            return await message.reply({ embeds: [embed] });
        }

        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setDescription('<:warning:1448832070628671488> Please provide a new prefix.\n\n**Usage:** `.setprefix <prefix>`')
                .setColor(0x2B2D31);
            return await message.reply({ embeds: [embed] });
        }

        const newPrefix = args[0];
        await setGuildConfig(message.guild.id, 'prefix', newPrefix);

        const embed = new EmbedBuilder()
            .setDescription(`<:checkmark:1448832045068583033> Prefix changed to \`${newPrefix}\` for this server.`)
            .setColor(0x2B2D31);
        await message.reply({ embeds: [embed] });
    }
};
