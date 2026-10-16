import { ROLES } from '@nst/shared/permissions.js'

import CalendarHost from '../models/calendarHost.js'
import GoogleCredential from '../models/googleCredential.js'
import Programme from '../models/programme.js'
import User from '../models/user.js'
import { canAutoTranscribe } from './googleWorkspace.js'

// Who hosts the programme's sessions on their Google Calendar: one admin for
// the bi-weekly sessions and the extra ones alike, so connecting from either
// page is the same connection. The academic board schedules through it.

// The host's user id: the one set here, else (from before there was one)
// the admin who first saved the programme, else null.
export const getHostId = async () => {
  const host = await CalendarHost.findOne({ key: 'host' }).lean()
  if (host) {
    return host.user
  }
  const programme = await Programme.findOne({ key: 'programme' })
    .select('host')
    .lean()
  return programme?.host ?? null
}

const isConnected = credential =>
  Boolean(credential) && !credential.needsReconnect

// Makes userId the host, on the programme too so the two never disagree.
const setHost = async userId => {
  await CalendarHost.findOneAndUpdate(
    { key: 'host' },
    { $set: { user: userId } },
    { upsert: true }
  )
  await Programme.updateOne({ key: 'programme' }, { $set: { host: userId } })
}

// After an admin connects Google: they become the host unless another host
// is still connected. Meetings already on a lost host's calendar can't be
// changed through the new one, so a connected host is never replaced.
export const claimHostIfFree = async user => {
  if (user.role !== ROLES.ADMIN) {
    return false
  }
  const current = await getHostId()
  if (current && String(current) !== String(user.id)) {
    const credential = await GoogleCredential.findOne({ user: current })
    if (isConnected(credential)) {
      return false
    }
  }
  await setHost(user.id)
  return true
}

// Whoever the programme's first save should name as host: the host if there
// is one, else the admin saving, who becomes it.
export const hostForNewProgramme = async userId => {
  const current = await getHostId()
  if (current) {
    return current
  }
  await setHost(userId)
  return userId
}

const NO_HOST = {
  id: null,
  username: null,
  email: null,
  connected: false,
  autoTranscripts: false,
  isYou: false,
  canConnect: false,
}

// The host as the Programme and Extra Sessions pages show it to `viewer`.
// With no host yet, an admin viewing is shown as the host they'd be: their
// first save there makes them it (or connecting, if they haven't).
export const hostStatus = async viewer => {
  const isAdmin = viewer.role === ROLES.ADMIN
  const hostId = (await getHostId()) ?? (isAdmin ? viewer.id : null)
  if (!hostId) {
    return NO_HOST
  }
  const [host, credential] = await Promise.all([
    User.findById(hostId).select('username email'),
    GoogleCredential.findOne({ user: hostId }),
  ])
  const connected = isConnected(credential)
  const isYou = String(hostId) === String(viewer.id)
  return {
    id: String(hostId),
    username: host?.username ?? null,
    email: host?.email ?? null,
    connected,
    autoTranscripts: canAutoTranscribe(credential),
    isYou,
    // The host reconnects; another admin can take over once it's lost.
    canConnect: isYou || (!connected && viewer.role === ROLES.ADMIN),
  }
}
