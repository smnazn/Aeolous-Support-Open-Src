const { SlashCommandBuilder, PermissionFlagsBits, AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationActionType, AutoModerationRuleKeywordPresetType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Crea o actualiza una regla de AutoMod')
        .addStringOption(o => o.setName('nombre').setDescription('Nombre de la regla').setRequired(true))
        .addStringOption(o => o.setName('tipo').setDescription('Tipo de trigger').setRequired(true)
            .addChoices(
                { name: 'keyword', value: 'keyword' },
                { name: 'keyword_preset', value: 'keyword_preset' },
                { name: 'mention_spam', value: 'mention_spam' },
                { name: 'spam', value: 'spam' },
            ))
        .addStringOption(o => o.setName('palabras').setDescription('Palabras clave separadas por coma').setRequired(false))
        .addStringOption(o => o.setName('preset').setDescription('Preset de palabras').setRequired(false)
            .addChoices(
                { name: 'profanity', value: 'profanity' },
                { name: 'sexual_content', value: 'sexual_content' },
                { name: 'slurs', value: 'slurs' },
            ))
        .addIntegerOption(o => o.setName('mencion_limite').setDescription('Límite de menciones').setRequired(false).setMinValue(1).setMaxValue(50))
        .addChannelOption(o => o.setName('canal_aviso').setDescription('Canal para alertas').setRequired(false))
        .addIntegerOption(o => o.setName('timeout_seg').setDescription('Timeout (segundos)').setRequired(false).setMinValue(10).setMaxValue(2419200))
        .addBooleanOption(o => o.setName('activar').setDescription('Activar/desactivar la regla').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = interaction.guild?.ownerId === interaction.user.id;
        // if (!isAdmin && !isOwner) { // handled by setDefaultMemberPermissions mostly, but double check
        //     await interaction.reply({ content: 'No tienes permiso.', ephemeral: true });
        //     return;
        // }

        const name = interaction.options.getString('nombre');
        const tipo = interaction.options.getString('tipo');
        const palabras = interaction.options.getString('palabras');
        const preset = interaction.options.getString('preset');
        const mentionLimit = interaction.options.getInteger('mencion_limite');
        const canalAviso = interaction.options.getChannel('canal_aviso');
        const timeoutSeg = interaction.options.getInteger('timeout_seg');
        const activar = interaction.options.getBoolean('activar');

        const changes = [];
        changes.push(`Tipo: **${tipo}**`);
        if (palabras) changes.push(`Palabras: \n${palabras.split(',').map(p => `\n- ${p.trim()}`).join('')}`);
        if (preset) changes.push(`Preset: **${preset}**`);
        if (mentionLimit !== null) changes.push(`Menciones límite: **${mentionLimit}**`);
        if (canalAviso) changes.push(`Canal aviso: <#${canalAviso.id}>`);
        if (timeoutSeg !== null) changes.push(`Timeout: **${timeoutSeg}s**`);
        if (activar !== null) changes.push(`Estado: **${activar ? 'activado' : 'desactivado'}**`);

        const triggerMetadata = {};
        let triggerType;
        if (tipo === 'keyword') {
            triggerType = AutoModerationRuleTriggerType.Keyword;
            if (!palabras) {
                await interaction.reply({ content: 'Debes proporcionar palabras clave para el trigger keyword', ephemeral: true });
                return;
            }
            triggerMetadata.keywordFilter = palabras.split(',').map(s => s.trim()).filter(Boolean);
        } else if (tipo === 'keyword_preset') {
            triggerType = AutoModerationRuleTriggerType.KeywordPreset;
            if (!preset) {
                await interaction.reply({ content: 'Debes seleccionar un preset', ephemeral: true });
                return;
            }
            const presetMap = {
                profanity: AutoModerationRuleKeywordPresetType.Profanity,
                sexual_content: AutoModerationRuleKeywordPresetType.SexualContent,
                slurs: AutoModerationRuleKeywordPresetType.Slurs,
            };
            triggerMetadata.presets = [presetMap[preset]];
        } else if (tipo === 'mention_spam') {
            triggerType = AutoModerationRuleTriggerType.MentionSpam;
            triggerMetadata.mentionTotalLimit = mentionLimit ?? 5;
        } else if (tipo === 'spam') {
            triggerType = AutoModerationRuleTriggerType.Spam;
        }

        const actions = [
            { type: AutoModerationActionType.BlockMessage },
        ];
        if (canalAviso) {
            actions.push({ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: canalAviso.id } });
        }
        if (timeoutSeg) {
            actions.push({ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: timeoutSeg } });
        }

        // Asegurar cache actualizado para evitar duplicados
        await interaction.guild.autoModerationRules.fetch().catch(() => { });

        let existing = interaction.guild.autoModerationRules.cache.find(r => r.name === name);
        if (!existing) {
            // Para triggers con límite de 1 regla (Spam, MentionSpam, etc.) reusar la existente
            const sameType = interaction.guild.autoModerationRules.cache.find(r => r.triggerType === triggerType);
            if (sameType) existing = sameType;
        }
        try {
            if (existing) {
                await existing.edit({
                    name,
                    triggerType,
                    triggerMetadata,
                    actions,
                    enabled: activar ?? true,
                }, 'Actualizado vía comando /automod');
                await interaction.reply({ content: `**Regla \`${existing.name}\` actualizada**\n\n${changes.map(c => `- ${c}`).join('\n')}`, ephemeral: true });
            } else {
                await interaction.guild.autoModerationRules.create({
                    name,
                    eventType: AutoModerationRuleEventType.MessageSend,
                    triggerType,
                    triggerMetadata,
                    actions,
                    enabled: activar ?? true,
                }, 'Creada vía comando /automod');
                await interaction.reply({ content: `Regla **${name}** creada`, ephemeral: true });
            }
        } catch (err) {
            console.error('Error en /automod:', err);
            await interaction.reply({ content: 'Error al aplicar la configuración. Verifica permisos y parámetros.', ephemeral: true });
        }
    },
};











