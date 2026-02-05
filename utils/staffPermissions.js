const StaffRole = require('../models/StaffRole');
const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has staff permissions
 * @param {GuildMember} member - The member to check
 * @returns {Promise<boolean>} - True if member has staff role or is admin
 */
async function hasStaffPermission(member) {
    if (!member) return false;

    // Admins always have staff permissions
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    // Check for configured staff role
    const staffRole = await StaffRole.findOne({ guildId: member.guild.id });
    if (!staffRole) return false;

    return member.roles.cache.has(staffRole.roleId);
}

/**
 * Get the staff role ID for a guild
 * @param {string} guildId - The guild ID
 * @returns {Promise<string|null>} - The staff role ID or null
 */
async function getStaffRoleId(guildId) {
    const staffRole = await StaffRole.findOne({ guildId });
    return staffRole ? staffRole.roleId : null;
}

module.exports = {
    hasStaffPermission,
    getStaffRoleId
};



