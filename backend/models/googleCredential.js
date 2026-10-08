import mongoose from 'mongoose'

// A mentor's connection to their Google Calendar, used to put check-ins on
// it and to read their Meet transcripts. The refresh token is encrypted
// (utils/tokenCrypto.js) and never leaves the server.
const googleCredentialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    googleEmail: {
      type: String,
      required: true,
    },
    scopes: [String],
    refreshToken: {
      type: String,
      required: true,
      select: false,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    // Google refused the token (revoked, expired or the password changed).
    // The mentor has to connect again before anything reaches the calendar.
    needsReconnect: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

export const modelName = 'GoogleCredential'

const GoogleCredential = mongoose.model(modelName, googleCredentialSchema)

export default GoogleCredential
