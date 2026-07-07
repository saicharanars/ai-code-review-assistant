import { Router } from 'express';

import { forgotPassword, logout, refreshToken, resetPassword, signin, signup, updatePassword, verify } from './user.controller';
import { createUser, signinUser, verifyquery, forgetpasswordbody, resetpasswordbody, updatepasswordparams } from '../types/user';
import { asyncHandler } from '../utils/asynhandler';
import { validateRequest } from '../middleware/validation';

const userroute: Router = Router();

userroute.post(
  '/signup',
  validateRequest({ body: createUser }),
  asyncHandler(signup)
);
userroute.post(
  '/signin',
  validateRequest({ body: signinUser }),
  asyncHandler(signin)
);
userroute.get(
  '/verify',
  validateRequest({ query: verifyquery }),
  asyncHandler(verify)
);
userroute.post('/refresh', asyncHandler(refreshToken));
userroute.post('/logout', asyncHandler(logout));
userroute.post('/forgotpassword',validateRequest({
  body:forgetpasswordbody
}), asyncHandler(forgotPassword))
userroute.post('/resetpassword/:forgotpasswordid',validateRequest({
  body:resetpasswordbody
}), asyncHandler(resetPassword))
userroute.get('/updatepassword/:updatepasswordid',validateRequest({
  params:updatepasswordparams
}), asyncHandler(updatePassword))


export default userroute;
