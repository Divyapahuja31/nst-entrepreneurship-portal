import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Role from '../models/role.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const roles = [
  {
    name: 'student',
    description: 'Student user',
  },
  {
    name: 'mentor',
    description: 'Mentor user',
  },
  {
    name: 'academic board',
    description: 'Academic board member',
  },
  {
    name: 'admin',
    description: 'Administrator',
  },
]

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)

    console.log('Connected to MongoDB')

    for (const role of roles) {
      await Role.updateOne(
        { name: role.name },
        { $set: role },
        { upsert: true }
      )
    }

    console.log('Roles seeded successfully')

    await mongoose.disconnect()
  } catch (error) {
    console.error('Failed to seed roles:', error)
    process.exit(1)
  }
}

seedRoles()
