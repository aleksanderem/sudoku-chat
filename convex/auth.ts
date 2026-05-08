import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Resend as ResendAPI } from "resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      reset: {
        id: "reset-code",
        type: "email" as const,
        name: "Reset Code",
        maxAge: 15 * 60, // 15 minutes
        async sendVerificationRequest({ identifier, token }) {
          const resend = new ResendAPI(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Sudoku <sudoku@kolabogroup.pl>",
            to: [identifier],
            subject: "Your Sudoku verification code",
            html: `
              <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
                <h2 style="text-align: center; color: #1a1a1a;">Sudoku</h2>
                <p style="color: #444; text-align: center;">Your password reset code is:</p>
                <div style="text-align: center; padding: 16px; margin: 16px 0; background: #f5f5f5; border-radius: 8px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a1a1a;">${token}</span>
                </div>
                <p style="color: #888; font-size: 13px; text-align: center;">
                  This code expires in 15 minutes. If you didn't request this, ignore this email.
                </p>
              </div>
            `,
          });
        },
        options: {},
      },
      validatePasswordRequirements(password: string) {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
      },
    }),
  ],
});
