import mongoose from 'mongoose'

// An email domain (or subdomain) people may sign up and sign in with. Each
// is matched exactly: allowing adypu.edu.in doesn't allow
// students.adypu.edu.in. Accounts from a staff domain start as mentors;
// everyone else starts as a student.
const emailDomainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    staff: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'EmailDomain'

const EmailDomain = mongoose.model(modelName, emailDomainSchema)

export default EmailDomain
