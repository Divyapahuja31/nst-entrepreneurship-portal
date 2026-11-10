import mongoose from 'mongoose'

// What admins changed about the emails, on the Emails page. There is one
// document (key "default"); see utils/emailSettings.js for the defaults and
// what each part means. Only values that differ from a default are stored.
const emailSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    sender: {
      fromName: { type: String, default: null },
      replyTo: { type: String, default: null },
    },
    brand: {
      title: { type: String, default: null },
      subtitle: { type: String, default: null },
      footer: { type: String, default: null },
    },
    rules: {
      lowPercent: { type: Number, default: null },
      passPercent: { type: Number, default: null },
      strikes: { type: Number, default: null },
    },
    // By email key: { enabled?: false, <field>: text }.
    templates: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false }
)

export const modelName = 'EmailSettings'

const EmailSettings = mongoose.model(modelName, emailSettingsSchema)

export default EmailSettings
