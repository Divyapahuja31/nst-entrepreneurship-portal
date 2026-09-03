import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import routes from './routes/index.js'

dotenv.config()

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err))

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// app.get('/', (req, res) => {
//   res.send('Hello from the backend!')
// })

app.use('/', routes)

app.listen(PORT, (err) => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.log(`Server is running on port ${PORT}`)
})
