import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId
      },
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
    },
    resetPasswordOtpFailures: {
      type: Number,
      default: 0,
    },
    resetPasswordOtpFailuresSince: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    signupOtp: {
      type: String,
      default: null,
    },
    signupOtpExpires: {
      type: Date,
      default: null,
    },
    signupOtpAttempts: {
      type: Number,
      default: 0,
    },
    signupOtpFailures: {
      type: Number,
      default: 0,
    },
    signupOtpFailuresSince: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

userSchema.virtual('biWeeklySubmissions', {
  ref: 'BiWeeklySubmission',
  localField: '_id',
  foreignField: 'founder',
})

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || typeof candidatePassword !== 'string') {
    return false
  }
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password
    // A 6-digit code's hash is cracked in under a second, so these never
    // leave the server.
    for (const prefix of ['signup', 'resetPassword']) {
      for (const suffix of [
        '',
        'Expires',
        'Attempts',
        'Failures',
        'FailuresSince',
      ]) {
        delete ret[`${prefix}Otp${suffix}`]
      }
    }
    return ret
  },
})

export const modelName = 'User'

const User = mongoose.model(modelName, userSchema)

export default User
