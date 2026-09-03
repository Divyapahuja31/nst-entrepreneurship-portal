import path from 'path'
import fs from 'fs'
import {URL} from 'node:url'

const __filename = new URL('', import.meta.url).pathname
const __dirname = new URL('.', import.meta.url).pathname // Will contain trailing slash

const basename = path.basename(__filename)
const models = {}

const files = fs.readdirSync(__dirname).filter(file => {
  return (
    file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
})

const requireModel = async modelPath => {
  const {default: model, modelName} = await import(modelPath)

  models[modelName] = model
}

for (const file of files) {
  const modelPath = path.join(__dirname, file)

  await requireModel(modelPath)
}

export default models
