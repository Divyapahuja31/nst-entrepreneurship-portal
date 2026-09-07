import {Router} from 'express'

import {signUp, signIn, logout} from '../controllers/user.js'

const router = Router()

router.post('/signup', signUp)
router.post('/login', signIn)
router.post('/logout', logout)

export default router
