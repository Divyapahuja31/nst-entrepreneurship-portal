import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import routes from './routes/index.js'
import { validateToken } from './utils/token.js'

dotenv.config()

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err))

const app = express()
const PORT = process.env.PORT || 4000

function authMiddleware(req, res, next) {
  const token = req.cookies.token
  const response = validateToken(token)
  if (response.valid) {
    req.user = {
      id: response.payload.userId,
      email: response.payload.email,
      roles: response.payload.roles,
    }
  }

  next()
}

app.use(
  cors({
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())
app.use(authMiddleware)

app.use('/api', routes)

app.listen(PORT, err => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.log(`Server is running on port ${PORT}`)
})
