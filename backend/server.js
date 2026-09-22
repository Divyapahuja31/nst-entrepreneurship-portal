import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import routes from './routes/index.js'
import attachUser from './middleware/attachUser.js'

dotenv.config()

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.info('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message))

const app = express()
const PORT = process.env.PORT || 4000

app.use(
  cors({
    origin: true,
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())
app.use(attachUser)

app.use('/api', routes)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDist = path.resolve(__dirname, '../frontend/dist')

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'))
    }
    return next()
  })
}

app.listen(PORT, err => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.info(`Server is running on port ${PORT}`)
})
