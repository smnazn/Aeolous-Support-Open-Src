const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuessGame = require('../../models/GuessGame');
const StaffRole = require('../../models/StaffRole');

// Store active timers to cancel them if game ends early
const gameTimers = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guessstart')
        .setDescription('Inicia el juego de adivinar el número')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('El número a adivinar (1-500)')
                .setMinValue(1)
                .setMaxValue(500)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('Premio para el ganador')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Tiempo límite en minutos (1-5)')
                .setMinValue(1)
                .setMaxValue(5)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    gameTimers,

    async execute(interaction) {
        const number = interaction.options.getInteger('number');
        const prize = interaction.options.getString('prize');
        const time = interaction.options.getInteger('time');
        await this.handleStart(interaction, number, prize, time);
    },

    async messageRun(message, args) {
        const hasPermission = message.member.permissions.has(PermissionFlagsBits.ManageMessages);

        // Check for staff role from database
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
        if (args.length < 2) {
            return message.reply('<:deny:1448831817963536506> Uso: `.guessstart <numero> <premio> [minutos]`');
        }

        const number = parseInt(args[0]);
        // Check if last arg is time in minutes
        const lastArg = parseInt(args[args.length - 1]);
        let time = null;
        let prize = '';

        if (!isNaN(lastArg) && lastArg >= 1 && lastArg <= 5 && args.length >= 3) {
            time = lastArg;
            prize = args.slice(1, -1).join(' ');
        } else {
            prize = args.slice(1).join(' ');
        }

        if (isNaN(number) || number < 1 || number > 500) {
            return message.reply('<:deny:1448831817963536506> El número debe estar entre 1 y 500.');
        }
        await this.handleStart(message, number, prize, time);
    },

    async handleStart(source, targetNumber, prize, timeLimit) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const host = source.user || source.author;

        try {
            const game = await GuessGame.findOne({ guildId: source.guild.id });

            if (!game || !game.channelId) {
                return reply({ content: '<:deny:1448831817963536506> Primero configura un canal con `/guesssetup`', ephemeral: true });
            }

            if (game.active) {
                const activeEmbed = new EmbedBuilder()
                    .setDescription(`<:warning:1448832070628671488> **Ya hay un juego activo**\n\n> Espera a que termine el juego actual antes de iniciar otro.`)
                    .setColor(0x2B2D31);
                return reply({ embeds: [activeEmbed], ephemeral: true });
            }

            const channel = await source.guild.channels.fetch(game.channelId);
            if (!channel) {
                return reply({ content: '<:deny:1448831817963536506> El canal configurado ya no existe.', ephemeral: true });
            }

            // Open channel and set slowmode
            await channel.permissionOverwrites.edit(source.guild.roles.everyone, {
                SendMessages: true
            });
            await channel.setRateLimitPerUser(3);

            // Update database
            game.active = true;
            game.targetNumber = targetNumber;
            game.prize = prize;
            game.startedBy = host.id;
            game.startedAt = new Date();
            game.guesses = [];
            await game.save();

            // Build time info
            const timeText = timeLimit ? `**Tiempo:** ${timeLimit} minuto${timeLimit > 1 ? 's' : ''}\n` : '';

            // Send announcement with configured ping
            const embed = new EmbedBuilder()
                .setDescription(
                    `<:dice:1449949517188436092> **¡ADIVINA EL NÚMERO!**\n` +
                    `**Premio:** ${prize}\n` +
                    `**Host:** ${host}\n` +
                    timeText +
                    `\n<a:15136blackdot:1448143887699804252> Escribe un número para intentar adivinar\n` +
                    `<a:15136blackdot:1448143887699804252> <:deny:1448831817963536506> = incorrecto | <:checkmark:1448832045068583033> = ¡GANASTE!`
                )
                .setColor(0x2B2D31)
                .setFooter({ text: 'Slowmode: 3 segundos activo' });

            // Use configured ping role if set
            const content = game.pingRoleId ? `<@&${game.pingRoleId}>` : null;
            await channel.send({ content, embeds: [embed] });

            // Set timer if time limit specified
            if (timeLimit) {
                const timeMs = timeLimit * 60 * 1000;
                const timer = setTimeout(async () => {
                    try {
                        const currentGame = await GuessGame.findOne({ guildId: source.guild.id });
                        if (currentGame && currentGame.active) {
                            // Auto-end the game
                            currentGame.active = false;
                            await currentGame.save();

                            // Lock channel
                            await channel.permissionOverwrites.edit(source.guild.roles.everyone, {
                                SendMessages: false
                            });
                            await channel.setRateLimitPerUser(0);

                            const timeoutEmbed = new EmbedBuilder()
                                .setDescription(
                                    `<:warning:1448832070628671488> **¡TIEMPO AGOTADO!**\n` +
                                    `**El número era:** \`${currentGame.targetNumber}\`\n` +
                                    `Nadie logró adivinar a tiempo.`
                                )
                                .setColor(0x2B2D31);

                            await channel.send({ embeds: [timeoutEmbed] });
                        }
                    } catch (e) {
                        console.error('Error in game timer:', e);
                    }
                }, timeMs);

                gameTimers.set(source.guild.id, timer);
            }

            await reply({ content: `<:checkmark:1448832045068583033> Juego iniciado en ${channel}. El número secreto es: ||${targetNumber}||${timeLimit ? ` (${timeLimit} min)` : ''}`, ephemeral: true });

        } catch (error) {
            console.error('Error starting guess game:', error);
            await reply({ content: '<:deny:1448831817963536506> Error al iniciar el juego.', ephemeral: true });
        }
    }
};
