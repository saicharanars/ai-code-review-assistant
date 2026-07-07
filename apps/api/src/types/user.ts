import * as z from 'zod';
const passwordSchema = z
  .string()
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/,
    'Password must be ≥8 chars and contain upper, lower & number'
  );
const validationErrorSchema = z.object({
  errors: z.array(
    z.object({
      message: z.string(),
      path: z.string(),
    })
  ),
});
const user = z.object({
  id: z.uuid(),
  name: z.string().min(3).max(64),
  email: z.email(),
  password: passwordSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const gettoken = user.pick({ id: true, });
const verifyquery = z.object({
  token: z.string(),
  email: z.email(),
});
const forgetpasswordbody = user.pick({
  email: true,
});
const updatepasswordparams = z.object({
  updatepasswordid: z.string(),
});
const resetpasswordbody = user
  .pick({
    password: true,
  })
  .extend({ otp: z.string().regex(/^\d{6}$/, 'Must be a 6-digit number') });
const createUser = user.omit({ id: true, createdAt: true, updatedAt: true });
const signinUser = user.pick({ email: true, password: true });

const refreshtoken = user
  .omit({
    name: true,
    email: true,
    password: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    iat: z.number(),
    exp: z.number(),
    jti: z.string(),
    familyId: z.string(),
  });
const refresh_token_body = z.object({
  refreshtoken: z.string(),
});
const usertoken = z.jwt();
const accessToken = refreshtoken.omit({ jti: true, familyId: true });
type UserType = z.infer<typeof user>;
type CreateUserType = z.infer<typeof createUser>;
type SigninUserType = z.infer<typeof signinUser>;
type accesstokenType = z.infer<typeof accessToken>;
type refreshTokenType = z.infer<typeof refreshtoken>;
type getTokenType = z.infer<typeof gettoken>;

export {
  user,
  createUser,
  usertoken,
  verifyquery,
  signinUser,
  validationErrorSchema,
  refreshtoken,
  accessToken,
  forgetpasswordbody,
  refresh_token_body,
  resetpasswordbody,
  updatepasswordparams,
  gettoken,
};
export type {
  UserType,
  CreateUserType,
  SigninUserType,
  refreshTokenType,
  accesstokenType,
  getTokenType,
};