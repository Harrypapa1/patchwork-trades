const { Resend } = require('resend');
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  try {
    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Parse the request body
    const { senderName, recipientName, messageText, replyLink, recipientEmail } = JSON.parse(event.body);
    // Validate required fields
    if (!recipientEmail || !messageText || !senderName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Patchwork Trades <noreply@patchworktrades.com>',
      to: [recipientEmail],
      subject: `New message from ${senderName} - Patchwork Trades`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Message from Patchwork Trades</h2>
          
          <p>Hi ${recipientName},</p>
          
          <p>You have a new message from <strong>${senderName}</strong>:</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">"${messageText}"</p>
          </div>
          
          <p>
            <a href="${replyLink}" 
               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reply to Message
            </a>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            The Patchwork Trades Team
          </p>
          
          <p style="color: #9ca3af; font-size: 12px;">
            This is an automated message from Patchwork Trades. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send email', details: error }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: data.id 
      }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
