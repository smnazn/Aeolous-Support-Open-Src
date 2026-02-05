const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Configura el slowmode del canal')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Segundos de slowmode (0 para desactivar)')
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    aliases: ['slow'],

    async execute(interaction) {
        const seconds = interaction.options.getInteger('seconds');
        await this.handleSlowmode(interaction, seconds);
    },

    async messageRun(message, args) {
        const isOwner = (process.env.OWNER_ID || '').split(',').map(id => id.trim()).includes(message.author.id);
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('❌ Necesitas permiso de Gestionar Canales.');
        }

        if (!args[0]) {
            const currentSlowmode = message.channel.rateLimitPerUser || 0;
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.INFO} Slowmode actual: **${currentSlowmode}s**\n\nUso: \`.slowmode <segundos>\``)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
            return message.reply('❌ Los segundos deben estar entre 0 y 21600 (6 horas).');
        }

        await this.handleSlowmode(message, seconds);
    },

    async handleSlowmode(source, seconds) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const channel = source.channel;

        try {
            await channel.setRateLimitPerUser(seconds);

            let description;
            if (seconds === 0) {
                description = `${DISCO_ICONS.CHECKMARK} Slowmode **desactivado**`;
            } else {
                const formatted = this.formatTime(seconds);
                description = `${DISCO_ICONS.CHECKMARK} Slowmode establecido a **${formatted}**`;
            }

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting slowmode:', error);
            await reply({ content: '❌ Error al configurar el slowmode.', ephemeral: true });
        }
    },

    formatTime(seconds) {
        if (seconds < 60) return `${seconds} segundos`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
        return `${Math.floor(seconds / 3600)} horas`;
    }
};
