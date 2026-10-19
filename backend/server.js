import mongoose from 'mongoose'
import app from './app.js'
import { startBackgroundJobs } from './utils/jobs.js'
import { migrateVentureMentors } from './utils/ventureMentorsMigration.js'

const PORT = process.env.PORT || 4000

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(async () => {
    console.info('Connected to MongoDB')
    try {
      const migrated = await migrateVentureMentors()
      if (migrated) {
        console.info(`Startups moved to a list of mentors: ${migrated}`)
      }
    } catch (error) {
      console.error('Could not move startups to a list of mentors:', error)
    }
    startBackgroundJobs()
  })
  .catch(err => console.error('Error connecting to MongoDB:', err.message))

app.listen(PORT, err => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.info(`Server is running on port ${PORT}`)
})
