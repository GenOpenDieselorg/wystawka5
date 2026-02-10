// Email template helper function - creates beautiful, responsive email templates
// Works well in both light and dark email clients

const createEmailTemplate = (title, content, buttonText, buttonUrl, footerText) => {
  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background-color: #ffffff; padding: 15px 30px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}" style="display: inline-block;">
                <img src="${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/logo.svg" alt="wystawoferte.pl" style="height: 50px; width: auto; max-width: 260px;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FFAB00; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
              ${buttonUrl && buttonText ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${buttonUrl}" style="display: inline-block; background-color: #667eea; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; text-align: center; min-width: 200px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              ${footerText ? `
              <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e5e5; color: #666666; font-size: 14px; line-height: 1.5;">
                ${footerText}
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                <strong style="color: #667eea;">wystawoferte.pl</strong><br>
                Ta wiadomość została wysłana automatycznie. Prosimy nie odpowiadać na ten email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

module.exports = { createEmailTemplate };

