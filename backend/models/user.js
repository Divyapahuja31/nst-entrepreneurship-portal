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
    biWeeklySubmission: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BiWeeklySubmission',
      },
    ],
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
  },
  {
    timestamps: true,
  }
)

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.set('toJSON', {
  transform: (_, ret) => {
    delete ret.password
    return ret
  },
})

export const modelName = 'User'

const User = mongoose.model(modelName, userSchema)

export default User
