import {Router} from 'express'

import userController from '../controllers/user.js'

const router = Router()

router.post('/users', userController.createUser)
router.get('/users', userController.getUsers)

export default router
