const nodemailer = require('nodemailer');

let transporter = null;

function initializeMailer() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    console.log('Email notifications enabled');
  } else {
    console.log('Email notifications disabled (configure GMAIL_USER and GMAIL_APP_PASSWORD in .env)');
  }
}

async function sendOrderNotification(to, subject, html) {
  if (!transporter) {
    console.log(`[Email skipped] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"SkipQ" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

function orderConfirmationEmail(orderDetails) {
  const { orderId, items, total, timeSlot, userName } = orderDetails;
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">SkipQ</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Order Confirmed!</p>
      </div>
      <div style="padding: 24px;">
        <p>Hey ${userName}! Your order <strong>#${orderId}</strong> has been placed.</p>
        <div style="background: #FFF5F0; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">Pickup Time: ${timeSlot}</p>
          ${items.map(i => `<p style="margin: 4px 0; color: #666;">${i.quantity}x ${i.name} - Rs.${i.price * i.quantity}</p>`).join('')}
          <hr style="border: none; border-top: 1px solid #FFD4BC; margin: 12px 0;">
          <p style="margin: 0; font-weight: 700; font-size: 18px;">Total: Rs.${total}</p>
        </div>
        <p style="color: #999; font-size: 13px;">We'll notify you when your food is ready!</p>
      </div>
    </div>
  `;
}

function orderReadyEmail(userName, orderId) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #22C55E, #16A34A); padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">SkipQ</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Your food is ready!</p>
      </div>
      <div style="padding: 24px; text-align: center;">
        <p style="font-size: 48px; margin: 0;">🍽️</p>
        <h2>Hey ${userName}!</h2>
        <p>Your order <strong>#${orderId}</strong> is ready for pickup.</p>
        <p style="color: #22C55E; font-weight: 600; font-size: 18px;">Head to the counter now!</p>
        <p style="color: #999; font-size: 13px;">Skip the queue, grab your food!</p>
      </div>
    </div>
  `;
}

module.exports = { initializeMailer, sendOrderNotification, orderConfirmationEmail, orderReadyEmail };
