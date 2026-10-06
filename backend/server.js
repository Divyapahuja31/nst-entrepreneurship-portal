import mongoose from 'mongoose'
import app from './app.js'

const PORT = process.env.PORT || 4000

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.info('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message))

app.listen(PORT, err => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.info(`Server is running on port ${PORT}`)
})
