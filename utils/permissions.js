const { PermissionFlagsBits } = require('discord.js');

function setManageMessages(builder) {
    return builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
}

function setAdministrator(builder) {
    return builder.setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
}

function setOwnerOnly(builder) {
    return builder.setDefaultMemberPermissions(0n);
}

function setManageChannels(builder) {
    return builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
}

function setManageNicknames(builder) {
    return builder.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames);
}

function setChangeNickname(builder) {
    return builder.setDefaultMemberPermissions(PermissionFlagsBits.ChangeNickname);
}

function isHighRole(member, botMember, distance = 3) {
    const botPos = botMember.roles.highest.position;
    return member.roles.highest.position >= botPos - distance;
}

function isAdmin(member) {
    return !!member?.permissions?.has?.(PermissionFlagsBits.Administrator);
}

function isGuildOwner(member) {
    return !!member?.guild && member.guild.ownerId === member.id;
}

function isAdminOrOwner(member) {
    return isAdmin(member) || isGuildOwner(member);
}

/**
 * Check if user is a bot owner (bypasses all permissions)
 * Supports multiple IDs separated by comma in OWNER_ID env var
 * @param {string} userId - User ID to check
 * @returns {boolean}
 */
function isBotOwner(userId) {
    const ownerIds = (process.env.OWNER_ID || '').split(',').map(id => id.trim());
    return ownerIds.includes(userId);
}

const ADMIN_ONLY_MESSAGE = 'No tienes permiso, solo administradores pueden ejecutar este comando';
const OWNER_ONLY_MESSAGE = 'No tienes permiso, solo el dueño del servidor puede ejecutar este comando';
const MANAGE_MESSAGES_MESSAGE = 'No tienes permiso, se requiere el permiso Gestionar Mensajes';
const MANAGE_CHANNELS_MESSAGE = 'No tienes permiso, se requiere el permiso Gestionar Canales';
const MANAGE_NICKNAMES_MESSAGE = 'No tienes permiso, se requiere el permiso Gestionar Apodos';
const CHANGE_NICKNAME_MESSAGE = 'No tienes permiso, se requiere el permiso Cambiar Apodo';
const NO_PERMISSION_MESSAGE = ADMIN_ONLY_MESSAGE;
const HIGH_ROLE_MESSAGE = 'No tienes permiso, se requiere rol alto con administrador';

module.exports = {
    setManageMessages,
    setAdministrator,
    setOwnerOnly,
    setManageChannels,
    ADMIN_ONLY_MESSAGE,
    OWNER_ONLY_MESSAGE,
    MANAGE_MESSAGES_MESSAGE,
    MANAGE_CHANNELS_MESSAGE,
    MANAGE_NICKNAMES_MESSAGE,
    CHANGE_NICKNAME_MESSAGE,
    NO_PERMISSION_MESSAGE,
    isHighRole,
    HIGH_ROLE_MESSAGE,
    setChangeNickname,
    setManageNicknames,
    isAdmin,
    isGuildOwner,
    isAdminOrOwner,
    isBotOwner,
};


