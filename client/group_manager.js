const Base = require('./base');
const config = require('../config');
const { decodeJid, parsedJid } = require('../utils');

class GroupManager extends Base {
 constructor(client, data) {
  super(client);
  if (data) this._patch(data);
 }

 _patch(data) {
  const { key, isGroup, message, pushName } = data;
  const senderID = message?.extendedTextMessage?.contextInfo?.participant || key.remoteJid;

  Object.assign(this, {
   user: decodeJid(this.client.user.id),
   key,
   isGroup,
   jid: key.remoteJid,
   senderID,
   pushName,
   participant: parsedJid(senderID)[0],
   isSudo: config.SUDO.split(',').includes(this.participant?.split('@')[0]) || false,
   fromMe: key.fromMe,
   isOwner: key.fromMe,
  });

  return super._patch(data);
 }

 /**
  * @param {string} action
  * @param {string|string[]} participants
  */
 async manageParticipants(action, participants) {
  return this.client.groupParticipantsUpdate(this.jid, Array.isArray(participants) ? participants : [participants], action);
 }

 /**
  * @param {string|string[]} participants
  */
 async add(participants) {
  return this.manageParticipants('add', participants);
 }

 /**
  * @param {string|string[]} participants
  */
 async remove(participants) {
  return this.manageParticipants('remove', participants);
 }

 /**
  * @param {string|string[]} participants
  */
 async promote(participants) {
  return this.manageParticipants('promote', participants);
 }

 /**
  * @param {string|string[]} participants
  */
 async demote(participants) {
  return this.manageParticipants('demote', participants);
 }

 /**
  * @param {string} name
  * @param {string[]} [members=[]]
  */
 async createGroup(name, members = []) {
  return this.client.groupCreate(name, members);
 }

 async leave() {
  return this.client.groupLeave(this.jid);
 }

 /**
  * @param {string} code
  */
 async joinByInvite(code) {
  return this.client.groupAcceptInvite(code);
 }

 /**
  * @param {string} groupJid
  * @param {string} message
  */
 async joinByInviteV4(groupJid, message) {
  return this.client.groupAcceptInviteV4(groupJid, message);
 }

 /**
  * @param {string} name
  */
 async updateName(name) {
  return this.client.groupUpdateSubject(this.jid, name);
 }

 /**
  * @param {string} description
  */
 async updateDescription(description) {
  return this.client.groupUpdateDescription(this.jid, description);
 }

 /**
  * @param {string} image
  */
 async updatePicture(jid, pp) {
  return this.client.updateProfilePicture(jid || this.jid, Buffer.isBuffer(pp) ? pp : { url: pp });
 }

 /**
  * @param {object} settings
  */
 async updateSettings(settings) {
  return this.client.groupSettingUpdate(this.jid, settings);
 }

 /**
  * @param {number} duration
  */
 async setEphemeral(duration) {
  return this.client.groupToggleEphemeral(this.jid, duration);
 }

 async getInviteCode() {
  return this.client.groupInviteCode(this.jid);
 }

 async revokeInvite() {
  return this.client.groupRevokeInvite(this.jid);
 }

 /**
  * @param {string} code
  */
 async getInviteInfo(code) {
  return this.client.groupGetInviteInfo(code);
 }

 /**
  * @param {string} inviteCode
  * @param {string} inviteMessage
  * @param {number} expiration
  */
 async sendInvite(inviteCode, inviteMessage, expiration) {
  return this.client.groupInviteMessage(this.jid, inviteCode, inviteMessage, expiration);
 }

 async fetchMetadata() {
  return this.client.groupMetadata(this.jid);
 }

 async fetchParticipants() {
  const metadata = await this.fetchMetadata();
  return metadata.participants;
 }

 async fetchMemberCount() {
  const metadata = await this.fetchMetadata();
  return metadata.participants.length;
 }

 /**
  * @param {string} jid
  */
 async isMember(jid) {
  const participants = await this.fetchParticipants();
  return participants.some((participant) => participant.id === jid);
 }

 /**
  * @param {string} jid
  */
 async isAdmin(jid) {
  const participants = await this.fetchParticipants();
  const participant = participants.find((p) => p.id === jid);
  return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
 }

 /**
  * @param {number} duration
  */
 async setDisappearingMessages(duration) {
  return this.client.groupSettingUpdate(this.jid, { disappearingMessages: duration });
 }

 /**
  * @param {boolean} isRestricted
  */
 async setRestrict(isRestricted) {
  return this.client.groupSettingUpdate(this.jid, { restrict: isRestricted });
 }

 /**
  * @param {boolean} isAnnounce
  */
 async setAnnounce(isAnnounce) {
  return this.client.groupSettingUpdate(this.jid, { announce: isAnnounce });
 }

 async mute() {
  return this.client.groupSettingUpdate(this.jid, 'announcement');
 }

 async unmute() {
  return this.client.groupSettingUpdate(this.jid, 'not_announcement');
 }

 async lock() {
  return this.client.groupSettingUpdate(this.jid, 'locked');
 }

 async unlock() {
  return this.client.groupSettingUpdate(this.jid, 'unlocked');
 }

 /**
  * @param {string[]} participants
  * @param {string} action
  */
 async updateParticipants(participants, action) {
  return this.client.groupParticipantsUpdate(this.jid, participants, action);
 }

 /**
  * @param {string} name
  */
 async changeName(name) {
  return this.updateName(name);
 }

 /**
  * @param {string} description
  */
 async changeDescription(description) {
  return this.updateDescription(description);
 }

 /**
  * @param {string} jid
  */
 async promoteAdmin(jid) {
  return this.promote(jid);
 }

 /**
  * @param {string} jid
  */
 async demoteAdmin(jid) {
  return this.demote(jid);
 }

 async getGroupLink() {
  const code = await this.getInviteCode();
  return `https://chat.whatsapp.com/${code}`;
 }

 /**
  * @param {string} link
  */
 async joinViaLink(link) {
  const code = link.split('https://chat.whatsapp.com/')[1];
  return this.joinByInvite(code);
 }

 async getJoinRequests() {
  return this.client.groupRequestParticipantsList(this.jid);
 }

 /**
  * @param {string} jid
  */
 async approveRequest(jid) {
  return this.client.groupRequestParticipantsUpdate(this.jid, [jid], 'approve');
 }

 /**
  * @param {string} jid
  */
 async rejectRequest(jid) {
  return this.client.groupRequestParticipantsUpdate(this.jid, [jid], 'reject');
 }

 /**
  * @param {string[]} jids
  */
 async bulkApproveRequests(jids) {
  return this.client.groupRequestParticipantsUpdate(this.jid, jids, 'approve');
 }

 /**
  * @param {string[]} jids
  */
 async bulkRejectRequests(jids) {
  return this.client.groupRequestParticipantsUpdate(this.jid, jids, 'reject');
 }

 async getGroupStats() {
  const metadata = await this.fetchMetadata();
  const participants = metadata.participants;
  return {
   memberCount: participants.length,
   adminCount: participants.filter((p) => p.admin).length,
   creationTime: metadata.creation,
   description: metadata.desc,
   owner: metadata.owner,
  };
 }
}

module.exports = GroupManager;
