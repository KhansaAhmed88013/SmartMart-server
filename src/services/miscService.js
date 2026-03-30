const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const { sequelize, ShopProfile, Product, User, Invoice } = require("../../db");

function sendEmail({ recipient_email, OTP, shopName, location, number1, number2 }) {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.MY_PASSWORD,
      },
    });

    const mail_configs = {
      from: process.env.MY_EMAIL,
      to: recipient_email,
      subject: `${shopName} PASSWORD RECOVERY`,
      html: `<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>${shopName} - OTP Email Template</title>
</head>
<body>
<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">${shopName}</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for choosing ${shopName}. Use the following OTP to complete your Password Recovery Procedure. OTP is valid for 5 minutes</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${OTP}</h2>
    <p style="font-size:0.9em;">Regards,<br />${shopName}</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>${shopName} Inc</p>
      <p>${number1} , ${number2}</p>
      <p>${location}</p>
    </div>
  </div>
</div>
</body>
</html>`,
    };

    transporter.sendMail(mail_configs, function (error) {
      if (error) {
        console.log(error);
        return reject({ message: "An error has occured" });
      }
      return resolve({ message: "Email sent succesfuly" });
    });
  });
}

async function sendRecoveryEmail(payload) {
  let shop = await ShopProfile.findOne();
  if (!shop) {
    shop = {
      shop_name: "POS Shopping Mart",
      location: "abc",
      number1: "03**-*******",
      number2: "03**-*******",
    };
  }

  return sendEmail({
    ...payload,
    shopName: shop.shop_name,
    location: shop.location,
    number1: shop.number1,
    number2: shop.number2,
  });
}

async function getAdminDashboard() {
  const productsCount = await Product.count();
  const usersCount = await User.count({ where: { status: "Active" } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const totalSalesData = await Invoice.findAll({
    attributes: [[sequelize.fn("SUM", sequelize.col("final_total")), "totalSales"]],
    where: {
      invoice_date: {
        [Op.between]: [startOfToday, endOfToday],
      },
    },
  });

  const totalSales = totalSalesData[0].get("totalSales") || 0;

  return {
    totalSales: Number(totalSales).toFixed(2),
    productsCount,
    usersCount,
  };
}

async function getHealthStatus() {
  const startedAt = Date.now();

  try {
    await sequelize.authenticate();
    return {
      status: 200,
      body: {
        ok: true,
        service: "smartmart-server",
        db: "up",
        timestamp: new Date().toISOString(),
        responseMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      status: 503,
      body: {
        ok: false,
        service: "smartmart-server",
        db: "down",
        timestamp: new Date().toISOString(),
        responseMs: Date.now() - startedAt,
        error: error.message,
      },
    };
  }
}

module.exports = {
  sendRecoveryEmail,
  getAdminDashboard,
  getHealthStatus,
};
