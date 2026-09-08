import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import Campus from '../models/campus.js'
import Batch from '../models/batch.js'

const seedInitialData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)

    console.log('Connected to MongoDB')

    const campus = await Campus.findOneAndUpdate(
      { name: 'ADYPU' },
      {
        name: 'ADYPU',
        location: 'Pune',
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      }
    )

    console.log(`Campus ready: ${campus.name}`)

    const batches = [
      {
        name: '2024-2028',
        startYear: 2024,
        endYear: 2028,
      },
      {
        name: '2025-2029',
        startYear: 2025,
        endYear: 2029,
      },
    ]

    for (const batchData of batches) {
      const batch = await Batch.findOneAndUpdate(
        {
          name: batchData.name,
          campus: campus._id,
        },
        {
          ...batchData,
          campus: campus._id,
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        }
      )

      console.log(`Batch ready: ${batch.name}`)
    }

    console.log('Initial data seeded successfully')

    await mongoose.disconnect()
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seedInitialData()
