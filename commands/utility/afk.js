const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your AFK status.')
        .addStringOption(option => option.setName('reason').setDescription('Reason for being AFK').setRequired(false)),
    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        interaction.client.afk = interaction.client.afk || new Map();
        interaction.client.afk.set(interaction.user.id, {
            reason,
            time: Date.now(),
            ignoreChannelId: interaction.channel.id,
            ignoreUntil: Date.now() + 2000 // Ignore messages for 2 seconds after setting AFK
        });

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.USER} AFK Set`)
            .setDescription(`**Reason:** \`${reason}\`\n\n${DISCO_ICONS.CHECKMARK} You are now AFK`)
            .setColor(0x2B2D31);
        await interaction.reply({ embeds: [embed] });
    },
    async messageRun(message, args) {
        const reason = args.join(' ') || 'No reason provided';
        message.client.afk = message.client.afk || new Map();
        message.client.afk.set(message.author.id, {
            reason,
            time: Date.now(),
            ignoreChannelId: message.channel.id,
            ignoreUntil: Date.now() + 2000 // Ignore messages for 2 seconds after setting AFK
        });

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.USER} AFK Set`)
            .setDescription(`**Reason:** \`${reason}\`\n\n${DISCO_ICONS.CHECKMARK} You are now AFK`)
            .setColor(0x2B2D31);
        await message.reply({ embeds: [embed] });
    }
};









