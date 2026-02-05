const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuessGame = require('../../models/GuessGame');
const StaffRole = require('../../models/StaffRole');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guesshint')
        .setDescription('Da una pista sobre el número')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Tipo de pista')
                .setRequired(true)
                .addChoices(
                    { name: '⬆️ Más alto / ⬇️ Más bajo', value: 'direction' },
                    { name: '🎯 Rango (ej: entre 40-60)', value: 'range' },
                    { name: '🔢 Par o Impar', value: 'parity' },
                    { name: '✍️ Pista personalizada', value: 'custom' }
                ))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Mensaje personalizado (solo para pista personalizada)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const type = interaction.options.getString('type');
        const customMessage = interaction.options.getString('message');
        await this.handleHint(interaction, type, customMessage);
    },

    async messageRun(message, args) {
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.ManageMessages);

        let hasStaffRole = false;
        try {
            const staffRoleDoc = await StaffRole.findOne({ guildId: message.guild.id });
            if (staffRoleDoc && message.member.roles.cache.has(staffRoleDoc.roleId)) {
                hasStaffRole = true;
            }
        } catch { }

        if (!hasPermission && !hasStaffRole) {
            return message.reply({ content: '<:deny:1448831817963536506> No tienes permiso para usar este comando.', ephemeral: true });
        }

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setDescription(
                    `<:dice:1449949517188436092> **Tipos de pista:**\n` +
                    `\`.guesshint direction\` - Más alto o más bajo\n` +
                    `\`.guesshint range\` - Muestra un rango\n` +
                    `\`.guesshint parity\` - Par o impar\n` +
                    `\`.guesshint custom <mensaje>\` - Pista personalizada`
                )
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        const type = args[0].toLowerCase();
        const customMessage = args.slice(1).join(' ');
        await this.handleHint(message, type, customMessage);
    },

    async handleHint(source, type, customMessage) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const game = await GuessGame.findOne({ guildId: source.guild.id });

            if (!game || !game.active) {
                return reply({ content: '<:deny:1448831817963536506> No hay ningún juego activo.', ephemeral: true });
            }

            const channel = await source.guild.channels.fetch(game.channelId).catch(() => null);
            if (!channel) {
                return reply({ content: '<:deny:1448831817963536506> El canal del juego no existe.', ephemeral: true });
            }

            let hintText = '';
            const number = game.targetNumber;

            switch (type) {
                case 'direction':
                    // Get last guess
                    const lastGuess = game.guesses?.length > 0 ? game.guesses[game.guesses.length - 1] : null;
                    if (!lastGuess) {
                        hintText = 'Aún no hay intentos para comparar.';
                    } else {
                        const direction = lastGuess.guess < number ? '⬆️ **Más alto**' : '⬇️ **Más bajo**';
                        hintText = `El último intento fue \`${lastGuess.guess}\`. El número es ${direction}`;
                    }
                    break;

                case 'range':
                    // Give a range of 20 around the number
                    const min = Math.max(1, number - 10);
                    const max = number + 10;
                    hintText = `🎯 El número está entre **${min}** y **${max}**`;
                    break;

                case 'parity':
                    const parity = number % 2 === 0 ? '**PAR**' : '**IMPAR**';
                    hintText = `🔢 El número es ${parity}`;
                    break;

                case 'custom':
                    if (!customMessage) {
                        return reply({ content: '<:deny:1448831817963536506> Debes escribir un mensaje para la pista personalizada.', ephemeral: true });
                    }
                    hintText = `✍️ ${customMessage}`;
                    break;

                default:
                    return reply({ content: '<:deny:1448831817963536506> Tipo de pista no válido.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setDescription(`<:gift:1448486379221811384> **¡PISTA!**\n\n${hintText}`)
                .setColor(0x2B2D31);

            await channel.send({ embeds: [embed] });
            await reply({ content: '<:checkmark:1448832045068583033> Pista enviada.', ephemeral: true });

        } catch (error) {
            console.error('Error sending hint:', error);
            await reply({ content: '<:deny:1448831817963536506> Error al enviar la pista.', ephemeral: true });
        }
    }
};
