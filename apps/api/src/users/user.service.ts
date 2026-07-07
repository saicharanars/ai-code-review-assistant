
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import crypto, { createHash, randomBytes } from 'crypto';

import db from '../db';
import { usersTable, tokensTable, forgotPasswordTable } from '../db/schema';
import { getTokenType, refreshTokenType, CreateUserType, UserType } from '../types/user';
import { ConflictError, InternalError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/customerrors';
import { mailer } from '../utils/mailer';
import { config } from '../config/index';



class UserService {
  private database: typeof db;
  private readonly secretkey = config.jwtSecret;
  private readonly smtpmailId = config.smtpMailId;
  private readonly apiurl = config.apiUrl;

  constructor(database: typeof db = db) {
    this.database = database;
  }
  async findUser(email: string) {
    const users = await this.database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!users.length) {
      return null;
    }

    const user = users[0];
    return user;
  }
  private async gettokens(
    payload: getTokenType
  ): Promise<{ access_token: string; refresh_token: string }> {
    const user = {
      id: payload.id,
    };
    const familyId = randomBytes(16).toString('hex');
    const refreshTokenId = randomBytes(32).toString('hex');
    const access_token = jwt.sign(user, this.secretkey, {
      expiresIn: '15m',
    });
    const refresh_token = jwt.sign(
      { ...user, jti: refreshTokenId, familyId },
      this.secretkey,
      {
        expiresIn: '7d',
      }
    );
    const decoded = jwt.decode(refresh_token);
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }
    const token_values = decoded as refreshTokenType;
    await this.database.insert(tokensTable).values({
      tokenHash: createHash('sha256').update(token_values.jti).digest('hex'),

      userId: user.id,
      familyId: token_values.familyId,

      used: false,

      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return {
      access_token,
      refresh_token,
    };
  }
  public async createuser(userData: CreateUserType): Promise<UserType> {
    const { email, name, password, } = userData;

    const founduser = await this.findUser(email);
    if (founduser) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const randomString = crypto.randomBytes(32).toString('hex');

    const user = {
      name,
      email,
      password: hashedPassword,
      verificationtoken: randomString,
    };

    const results = await this.database
      .insert(usersTable)
      .values(user)
      .returning();

    const newUser = results[0];
    if (!newUser) {
      throw new InternalError(
        'User creation failed: database returned no data'
      );
    }

    const verificationUrl = `${config.appUrl}/api/users/verify?token=${randomString}&email=${email}`;

    const firstName = name.split(' ')[0] || name;

    const mail = await mailer.sendMail({
      from: this.smtpmailId,
      to: email,
      subject: 'Verify Your Email Address',
      text: `Hi ${firstName},\n\nThank you for signing up! Please verify your email address by clicking this link: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, please ignore this email.`,
      html: `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if mso]>
    <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <title>Verify Your Email</title>
    <style>
        /* Email client compatible CSS */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
        
        /* Responsive for mobile */
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; max-width: 600px !important; }
            .mobile-padding { padding-left: 10px !important; padding-right: 10px !important; }
            .button { width: 100% !important; display: block !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
    
    <!-- Main container table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Content wrapper -->
                <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px;">

                    
                    <!-- Main content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 20px 40px 40px;">
                            
                            <!-- Greeting -->
                            <h1 style="color: #2c3e50; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: left;">Verify Your Email Address</h1>
                            
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;">
                                Hello <strong>${firstName}</strong>,
                            </p>
                            
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
                                Thank you for signing up! Please confirm your email address by clicking the button below:
                            </p>
                            
                            <!-- CTA Button (Bulletproof) -->
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" bgcolor="#4CAF50" style="border-radius: 6px; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);">
                                                    <a href="${verificationUrl}" class="button" target="_blank" style="background-color: #4CAF50; border: 16px solid #4CAF50; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 0 30px; line-height: 24px;">
                                                        Verify My Email
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security notice -->
                            <p style="color: #718096; font-size: 14px; line-height: 1.4; margin: 20px 0;">
                                <strong>Security Notice:</strong> This verification link will expire in <strong>24 hours</strong>. If you didn't request this, please ignore this email.
                            </p>
                            
        
                  
                            
                        </td>
                    </tr>

                    
                </table>
            </td>
        </tr>
    </table>
    
</body>
</html>`,
    });

    if (!mail) {
      throw new InternalError('Failed to send verification email');
    }

    console.log(
      `Verification email sent to ${email} with token: ${randomString}`
    );

    return {
      ...newUser,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    };
  }

  async checkPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  generateRandom6DigitNumber(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }
  async loginuser(
    email: string,
    password: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const founduser = await this.findUser(email);
    if (!founduser) {
      throw new ConflictError(
        "user with this email doesn't exists. Please sign up"
      );
    } else {
      const check = await this.checkPassword(password, founduser.password);
      if (!check) {
        throw new ConflictError('check your password');
      }
      const payload = {
        id: founduser.id,
      };
      const { access_token, refresh_token } = await this.gettokens(payload);

      return {
        access_token,
        refresh_token,
      };
    }
  }

  async refreshToken(oldTokenString: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    // 1. VERIFY signature AND expiration in one call
    let decoded: refreshTokenType;
    try {
      decoded = jwt.verify(oldTokenString, this.secretkey) as refreshTokenType;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired, please login');
      }
      throw new ValidationError('Invalid token');
    }

    const tokenHash = createHash('sha256').update(decoded.jti).digest('hex');

    return await this.database.transaction(async (tx) => {
      const [tokenRecord] = await tx
        .select()
        .from(tokensTable)
        .where(eq(tokensTable.tokenHash, tokenHash))
        .for('update'); // Lock the row

      if (!tokenRecord) throw new ForbiddenError('Token not found');

      if (tokenRecord.used) {
        await tx
          .delete(tokensTable)
          .where(eq(tokensTable.familyId, tokenRecord.familyId));
        throw new ForbiddenError('Token reuse detected! Please login again.');
      }

      // Mark old token as used
      await tx
        .update(tokensTable)
        .set({ used: true, usedAt: new Date() })
        .where(eq(tokensTable.id, tokenRecord.id));

      // Generate new tokens
      const newRefreshTokenId = randomBytes(32).toString('hex');
      const access_token = jwt.sign({ id: tokenRecord.userId }, this.secretkey, {
        expiresIn: '15m',
      });
      const refresh_token = jwt.sign(
        { id: tokenRecord.userId, jti: newRefreshTokenId, familyId: tokenRecord.familyId },
        this.secretkey,
        { expiresIn: '7d' }
      );

      const newDecoded = jwt.decode(refresh_token) as refreshTokenType;
      await tx.insert(tokensTable).values({
        tokenHash: createHash('sha256').update(newDecoded.jti).digest('hex'),
        userId: tokenRecord.userId,
        familyId: tokenRecord.familyId,
        used: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { access_token, refresh_token };
    });
  }
  async verifyemail(token: string, email: string) {
    const finduser = await this.database
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!finduser.length) {
      throw new ConflictError('user verifcation failed,not found user');
    }
    const user = finduser[0];
    if (user.verified) {
      throw new ConflictError('user already verified');
    }
    if (user.verificationtoken !== token) {
      throw new ConflictError(
        'User verification failed, link expired or invalid'
      );
    }
    await this.database
      .update(usersTable)
      .set({ verified: true })
      .where(eq(usersTable.id, user.id));

    return {
      success: true,
      message: 'User verified successfully',
    };
  }
  async logout(token: string): Promise<void> {
    let decoded: refreshTokenType;
    try {
      decoded = jwt.verify(token, this.secretkey) as refreshTokenType;
    } catch {
      throw new ValidationError('Invalid token');
    }
    const tokenHash = createHash('sha256').update(decoded.jti).digest('hex');
    const result = await this.database
      .delete(tokensTable)
      .where(eq(tokensTable.tokenHash, tokenHash))
      .returning();
    if (result.length === 0) {
      throw new ForbiddenError('Token not found');
    }
  }
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.findUser(email);
    const otp = this.generateRandom6DigitNumber();

    if (!user) {
      throw new NotFoundError("user with this email doesn't exists");
    }
    const [createforget] = await this.database
      .insert(forgotPasswordTable)
      .values({
        userId: user.id,
        token: otp,
        expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000),
      })
      .returning();
    if (!createforget) {
      throw new InternalError('Failed to create forget password');
    }
    const firstName = user.name;
    const updatePasswordLink = `${this.apiurl}/api/users/updatepassword/${createforget.id}`;
    const mail = await mailer.sendMail({
      from: this.smtpmailId,
      to: email,
      subject: 'Forgot Password OTP',
      text: `Hi ${firstName},\n\nYou have requested to reset your password. Your OTP is: ${otp}\n\nThis OTP will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.\n`,
      html: `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if mso]>
    <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <title>Forgot Password OTP</title>
    <style>
        /* Email client compatible CSS */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
        
        /* Responsive for mobile */
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; max-width: 600px !important; }
            .mobile-padding { padding-left: 10px !important; padding-right: 10px !important; }
            .button { width: 100% !important; display: block !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
    
    <!-- Main container table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Content wrapper -->
                <table class="container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px;">

                    
                    <!-- Main content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 20px 40px 40px;">
                            
                            <!-- Greeting -->
                            <h1 style="color: #2c3e50; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: left;">Forgot Password OTP</h1>
                            
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;">
                                Hello <strong>${firstName}</strong>,
                            </p>
                            
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
                                You have requested to reset your password. Your OTP is:
                            </p>
                            
                            <!-- OTP Display -->
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" bgcolor="#4CAF50" style="border-radius: 6px; box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);">
                                                    <span style="background-color: #4CAF50; border: 16px solid #4CAF50; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 0 30px; line-height: 24px;">
                                                        ${otp}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <!-- Update Password Link -->
                            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin: 20px 0;">
                                Click the link below to update your password:
                            </p>
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 10px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${updatePasswordLink}" style="background-color: #007bff; border: 16px solid #007bff; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 0 30px; line-height: 24px;">
                                            Update Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security notice -->
                            <p style="color: #718096; font-size: 14px; line-height: 1.4; margin: 20px 0;">
                                <strong>Security Notice:</strong> This OTP will expire in <strong>30 minutes</strong>. If you didn't request this, please ignore this email.
                            </p>
                            
        
                  
                            
                        </td>
                    </tr>

                    
                </table>
            </td>
        </tr>
    </table>
    
</body>
</html>`,
    });
    if (!mail) {
      throw new InternalError('Failed to send verification email');
    }
    return true;
  }
  async resetPassword(
    password: string,
    forgotPasswordId: string,
    otp: string
  ): Promise<boolean> {
    const passwordrequest = await this.database
      .select()
      .from(forgotPasswordTable)
      .where(eq(forgotPasswordTable.id, forgotPasswordId))
      .limit(1);
    if (!passwordrequest.length) {
      throw new NotFoundError('Password reset request not found');
    }

    if (otp !== passwordrequest[0].token) {
      throw new UnauthorizedError('otp entered is incorrect');
    }
    const now = new Date().getTime();

    if (
      now > passwordrequest[0].expiresAt.getTime() ||
      passwordrequest[0].used
    ) {
      throw new ForbiddenError('Password request expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await this.database
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.id, passwordrequest[0].userId));
    if (!result) {
      throw new InternalError('failed to upadate password');
    }
    await this.database
      .update(forgotPasswordTable)
      .set({ used: true })
      .where(eq(forgotPasswordTable.id, passwordrequest[0].id));
    return true;
  }
  async updatePassword(forgotpasswordid: string): Promise<string> {
    const passwordrequest = await this.database
      .select()
      .from(forgotPasswordTable)
      .where(eq(forgotPasswordTable.id, forgotpasswordid))
      .limit(1);
    if (!passwordrequest.length) {
      throw new NotFoundError('Password reset request was not found, please retry');
    }

    const linkHtml = `
    <html>
      <head>
        <title>Update Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
          }
          .password-form {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 300px;
          }
          .password-form label {
            display: block;
            margin-bottom: 5px;
          }
          .password-form input {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .password-form button {
            width: 100%;
            padding: 10px;
            background-color: #007bff;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .password-form button:hover {
            background-color: #0056b3;
          }
          #status-message {
            margin-top: 10px;
            color: #333;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="password-form">
          <form action="/api/users/resetpassword/${forgotpasswordid}" method="post" onsubmit="formSubmitted(event)" data-forgotpasswordid="${forgotpasswordid}">
            <label for="newpassword">Enter New Password:</label>
            <input name="newpassword" type="password" required></input>
            <label for="otp">Enter OTP:</label>
            <input name="otp" type="text" required></input>
            <button type="submit">Update Password</button>
          </form>
          <p id="status-message"></p>
        </div>
        <script>
          function formSubmitted(e) {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            const password = formData.get('newpassword');
            const otp = formData.get('otp');
            const forgotpasswordid = form.getAttribute('data-forgotpasswordid');

            fetch(\`/api/users/resetpassword/\${forgotpasswordid}\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                password: password,
                otp: otp
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.message) {
                document.getElementById('status-message').innerText = data.message;
              } else {
                document.getElementById('status-message').innerText = 'Failed to update password.';
              }
            })
            .catch(error => {
              document.getElementById('status-message').innerText = 'An error occurred during submission.';
              console.error('Error:', error);
            });
          }
        </script>
      </body>
    </html>
  `;

    return linkHtml;
  }
}

export default UserService;