import models from '../models/index.js'

const {User} = models

const createUser = async (req, res) => {
  const user = new User({
    username: 'test',
    email: 'test@test.com',
    password: 'test',
  })

  try {
    await user.save()
    res.send(user)
  } catch (err) {
    console.error(err)
    res.send(err)
  }
}

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
    res.send(users)
  } catch (err) {
    console.error(err)
    res.send(err)
  }
}

export default {
  createUser,
  getUsers,
}
