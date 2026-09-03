  import express from 'express'
  import cors from 'cors'
  // import dotenv from 'dotenv'

  // dotenv.config()

  const app = express()
  const PORT = process.env.PORT || 4000

  app.use(cors())
  app.use(express.json())

  app.get('/', (req, res) => {
    res.send('Hello from the backend!')
  })

  app.listen(PORT, (err) => {
    if (err) {
      console.error('Error starting the server:', err)
      return
    }
    console.log(`Server is running on port ${PORT}`)
  })

