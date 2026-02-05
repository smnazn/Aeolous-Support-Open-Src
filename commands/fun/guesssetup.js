const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuessGame = require('../../models/GuessGame');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guesssetup')
        .setDescription('Configura el canal para el juego de adivinar el número')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Canal donde se jugará')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('ping')
                .setDescription('Rol a mencionar cuando inicie un juego')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const pingRole = interaction.options.getRole('ping');
        await this.handleSetup(interaction, channel, pingRole);
    },

    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<:deny:1448831817963536506> Solo administradores pueden usar este comando.');
        }
        const channel = message.mentions.channels.first();
        const pingRole = message.mentions.roles.first();

        if (!channel) {
            return message.reply('<:deny:1448831817963536506> Uso: `.guesssetup #canal [@rol-ping]`');
        }
        await this.handleSetup(message, channel, pingRole);
    },

    async handleSetup(source, channel, pingRole) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            // Lock the channel initially
            await channel.permissionOverwrites.edit(source.guild.roles.everyone, {
                SendMessages: false
            });

            // Save to database
            await GuessGame.findOneAndUpdate(
                { guildId: source.guild.id },
                {
                    guildId: source.guild.id,
                    channelId: channel.id,
                    pingRoleId: pingRole?.id || null,
                    active: false
                },
                { upsert: true }
            );

            const pingInfo = pingRole
                ? `**Ping:** ${pingRole}`
                : `**Ping:** Ninguno`;

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:checkmark:1448832045068583033> **Canal Configurado**\n` +
                    `**Canal:** ${channel}\n` +
                    `${pingInfo}\n` +
                    `**Estado:** <:blocked:1449955403109498932> Bloqueado\n\n` +
                    `<a:15136blackdot:1448143887699804252> Usa \`/guessstart\` para iniciar un juego`
                )
                .setColor(0x2B2D31);

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting up guess game:', error);
            await reply({ content: '<:deny:1448831817963536506> Error al configurar el canal.', ephemeral: true });
        }
    }
};
