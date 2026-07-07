import { Request, Response } from 'express';
import UserService from './user.service';
import { CreateUserType, SigninUserType } from '../types/user';
import { UnauthorizedError, ValidationError } from '../utils/customerrors';
import { config } from '../config';

const userService = new UserService();
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_OAUTH_MAX_AGE = 10 * 60 * 1000;

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/',
  });
};

const signup = async (req: Request, res: Response) => {
  const user = await userService.createuser(req.body as CreateUserType);
  res.status(201).json({ data: { user }, message: 'user creation successful' });
};

const verify = async (req: Request, res: Response) => {
  const { token, email } = req.query as { token: string; email: string };
  const result = await userService.verifyemail(token, email);
  res.status(200).json(result);
};

const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body as SigninUserType;
  const result = await userService.loginuser(email, password);
  setRefreshCookie(res, result.refresh_token);
  res.status(200).json({ access_token: result.access_token });
};

const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new UnauthorizedError('please login');

  const result = await userService.refreshToken(refreshToken);
  setRefreshCookie(res, result.refresh_token);
  res.status(200).json({ access_token: result.access_token });
};

const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) throw new UnauthorizedError('please login');

  await userService.logout(refreshToken);
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  res.status(200).json({ message: 'logged out successfully' });
};

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ValidationError('email is required');

  await userService.forgotPassword(email);
  res.status(201).json({ message: 'forget password otp has been sent successfully' });
};

const resetPassword = async (req: Request, res: Response) => {
  const { forgotpasswordid } = req.params;
  const { password, otp } = req.body;
  if (!password || !forgotpasswordid) {
    throw new ValidationError('please check your password input or request');
  }
  await userService.resetPassword(password, forgotpasswordid, otp);
  res.status(201).json({ message: 'password has been updated successfully' });
};

const updatePassword = async (req: Request, res: Response) => {
  const { updatepasswordid } = req.params;
  if (!updatepasswordid) {
    throw new ValidationError('please check your password input or request');
  }
  const result = await userService.updatePassword(updatepasswordid);
  res.status(200).send(result);
};



export {
  signup,
  signin,
  verify,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  updatePassword,
};