import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {

    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log("RESEND API KEY:", process.env.RESEND_API_KEY);
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // In a real app, you would:
    // 1. Check if the user exists in your database
    // 2. Generate a unique secure token (JWT)
    // 3. Save that token in your database with an expiry date

    // For this example, we'll just send a random token
    const token = "abc-123-unique-token";
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    const {data, error } = await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_VERIFIED_SENDER}`, // Use your verified domain here in production
      to: [email],
      subject: 'Reset Your Nexus Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .button:hover { background-color: #4338ca !important; }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 40px 0;">
              <tr>
                <td align="center">
                  <!-- Main Card -->
                  <table border="0" cellpadding="0" cellspacing="0" width="500" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Top Gradient Accent Bar (Simulated) -->
                    <tr>
                      <td style="background: linear-gradient(to right, transparent, #818cf8, transparent); height: 4px; line-height: 4px; font-size: 1px;">&nbsp;</td>
                    </tr>

                    <!-- Brand Header -->
                    <tr>
                      <td align="center" style="padding: 40px 40px 20px 40px;">
                        <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -1px; margin: 0; font-style: italic;">
                          NEXUS
                        </h1>
                        <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; font-weight: 600;">
                          The Future of Connectivity
                        </p>
                      </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                      <td align="center" style="padding: 20px 40px 40px 40px;">
                        <div style="background-color: #0f172a; border-radius: 16px; padding: 30px; border: 1px solid #334155; text-align: center;">
                          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Hello, <br><br>
                            We received a request to reset your password. To secure your account and regain access, please click the button below.
                          </p>
                          
                          <!-- CTA Button -->
                          <a href="${resetLink}" class="button" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                            Reset Password
                          </a>
                          
                          <p style="color: #64748b; font-size: 13px; margin-top: 30px; line-height: 1.5;">
                            This link will expire in 1 hour for your security.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                      <td align="center" style="padding: 0 40px 40px 40px;">
                        <p style="color: #475569; font-size: 12px; margin: 0;">
                          If you didn't request this, you can safely ignore this email.
                        </p>
                        <p style="color: #475569; font-size: 12px; margin-top: 10px;">
                          &copy; ${new Date().getFullYear()} NEXUS Inc. All rights reserved.
                        </p>
                      </td>
                    </tr>

                    <!-- Bottom Gradient Accent Bar (Simulated) -->
                    <tr>
                      <td style="background: linear-gradient(to right, transparent, #818cf8, transparent); height: 4px; line-height: 4px; font-size: 1px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    });

    if(error){
      return NextResponse.json({ error: error.message }, { status: 500 });
      console.error(error);
    }

    return NextResponse.json({ message: 'Reset link sent successfully', data: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send reset email" + error.message }, { status: 500 });
  }
}