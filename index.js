const express = require("express");
const db = require("./koneksi");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;
const { createServer } = require("http");
const http = require("http");
const httpServer = createServer(app);
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const midtransClient = require("midtrans-client");

function generateUID() {
  const timestamp = new Date().getTime().toString();
  const randomString = Math.random().toString(36).substring(2, 6);
  const uid = timestamp + randomString;
  return uid;
}

// httpServer.listen(3001);

function userenticate(req, res, next) {
  const userToken = req.headers.userorization;

  if (userToken && userToken === "Bearer OmyooData") {
    next();
  } else {
    res.status(401).json({
      status: "401",
      message: "Tidak dapat mengakses data anda tidak memiliki userorization",
    });
  }
}

app.get("/orders", userenticate, (req, res) => {
  const getUsersQuery = "SELECT * FROM orders";
  db.query(getUsersQuery, (error, results) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      res.status(200).json(results);
    }
  });
});

const generateOrderId = () => {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const id = generateOrderId();
app.post("/order", async (req, res) => {
  const { items, email } = req.body;
  const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: "SB-Mid-server-BGYfA4SBqkbbDqAgycBbBqIB",
    clientKey: "SB-Mid-client-LAESY4DvSHanXr5C",
  });

  if (!items || items.length === 0 || !email) {
    console.log("Please provide valid order details");
    return res
      .status(400)
      .json({ error: "Please provide valid order details" });
  }

  const exchangeRate = 15000;

  const convertToIDR = (priceInDollar) => {
    return priceInDollar * exchangeRate;
  };

  try {
    const transactionsData = await Promise.all(
      items.map(async (item) => {
        const order_id_midtrans = generateOrderId(); // Generate unique order_id for Midtrans
        const priceInIDR = convertToIDR(item.price);

        const transaction = {
          transaction_details: {
            order_id: order_id_midtrans,
            gross_amount: priceInIDR,
            email: email,
          },
          customer_details: {
            email: email,
            first_name: item.username,
          },
        };

        console.log("Data to be paid for item:", item);
        console.log("Transaction details:", transaction);

        const snapTransaction = await snap.createTransaction(transaction);

        return {
          snapTransaction: snapTransaction,
          order_id_midtrans: order_id_midtrans, // Keep track of order_id for database use
          itemData: {
            order_id: order_id_midtrans,
            id_product: item.id_product,
            image: item.image,
            nm_product: item.nm_product,
            price: priceInIDR,
            qty: item.qty,
            email: email,
            username: item.username,
            status: "pending",
          },
        };
      })
    );
    const order_id_midtrans = transactionsData[0].order_id_midtrans;
    const insertOrderQuery =
      "INSERT INTO pay (order_id, id_product, image, nm_product, price, qty, email,time, username , status) VALUES (?, ?, ?, ?, ?, ?, ?, NOW() , ? , ?)";

    await Promise.all(
      transactionsData.map(async (transactionData) => {
        const { snapTransaction, itemData } = transactionData;

        await new Promise((resolve, reject) => {
          db.query(
            insertOrderQuery,
            [
              order_id_midtrans,
              itemData.id_product,
              itemData.image,
              itemData.nm_product,
              itemData.price,
              itemData.qty,
              itemData.email,

              itemData.username,
              itemData.status,
            ],
            (error, results) => {
              if (error) {
                console.error("Error placing order:", error);
                reject(error);
              } else {
                console.log("Order placed successfully:", results);
                resolve();
              }
            }
          );
        });

        console.log("Snap Transaction Data:", snapTransaction);
      })
    );

    const redirectUrl = transactionsData[0].snapTransaction.redirect_url;

    const responseData = {
      redirectUrl: redirectUrl,
      order_id: transactionsData[0].order_id_midtrans, // Use the same order_id for the response
    };

    console.log("Response Data:", responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Failed to process order:", error);
    res.status(500).json({ error: "Failed to process order" });
  }
});

app.get("/order-status/:order_id", (req, res) => {
  const { order_id } = req.params;

  const getOrderStatusQuery = "SELECT * FROM pay WHERE order_id = ?";
  const values = [order_id];

  db.query(getOrderStatusQuery, values, (error, results) => {
    if (error) {
      console.error("Error querying order status:", error);
      return res.status(500).json({ error: "Error querying order status" });
    }

    if (results.length === 0) {
      console.log("Order not found");
      return res.status(404).json({ error: "Order not found" });
    }

    const orderStatus = results[0].status;

    res.status(200).json({ order_id, status: orderStatus });
  });
});

app.post("/midtrans-callback", (req, res) => {
  const { order_id, transaction_status, fraud_status } = req.body;

  let status = "";

  switch (transaction_status) {
    case "capture":
      status = "captured";
      break;
    case "settlement":
      status = "settled";
      break;
    case "pending":
      status = "pending";
      break;
    case "cancel":
      status = "canceled";
      break;
    case "expire":
      status = "expired";
      break;
    default:
      console.log(
        `Unknown transaction status for order ${order_id}: ${transaction_status}`
      );
      break;
  }

  if (status) {
    const updateStatusQuery = "UPDATE pay SET status = ? WHERE order_id = ?";
    const values = [status, order_id];

    db.query(updateStatusQuery, values, (error, results) => {
      if (error) {
        console.error(`Error updating status for order ${order_id}:`, error);
        res
          .status(500)
          .json({ error: `Error updating status for order ${order_id}` });
      } else {
        console.log(`Status updated for order ${order_id} to: ${status}`);
        res.sendStatus(200);
      }
    });
  } else {
    res.sendStatus(200);
  }
});

// Endpoint untuk login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  console.log(`Email: ${email}, Password: ${password}`);

  const getUserQuery = "SELECT * FROM user WHERE email = ?";
  db.query(getUserQuery, [email], (error, results) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      if (results.length === 0) {
        res.status(401).json({ message: "Email atau password salah" });
      } else {
        const user = results[0];
        if (password === user.password) {
          // Sign the JWT token with a 60-second expiration for testing
          const token = jwt.sign(
            { userId: user.uid, email: user.email },
            "rahasia-kunci-jwt",
            { expiresIn: "1h" } // Set expiration to 60 seconds for testing
          );

          // Update the user's token in the database
          const insertTokenQuery =
            "UPDATE user SET token_jwt = ? WHERE uid = ?";
          db.query(
            insertTokenQuery,
            [token, user.uid],
            (insertError, insertResults) => {
              if (insertError) {
                console.error(insertError);
                res.sendStatus(500);
              } else {
                // Respond with the token and other user information
                res.status(200).json({
                  message: "login",
                  token,
                  username: user.username,
                  uid: user.uid,
                });
              }
            }
          );

          // Schedule a task to clear the token after 60 seconds (for testing)
          setTimeout(() => {
            const clearTokenQuery =
              "UPDATE user SET token_jwt = NULL WHERE uid = ?";
            db.query(
              clearTokenQuery,
              [user.uid],
              (clearError, clearResults) => {
                if (clearError) {
                  console.error(clearError);
                  // Handle the error accordingly
                } else {
                  // Log or handle the successful token clearance
                  console.log(`Token cleared for user ${user.uid}`);
                }
              }
            );
          }, 60 * 60 * 1000); // Adjusted to 60 seconds for testing
        } else {
          res.status(401).json({ message: "Email atau password salah" });
        }
      }
    }
  });
});

app.post("/get-username", (req, res) => {
  const { email } = req.body;

  const getUserQuery = "SELECT username FROM user WHERE email = ?";
  db.query(getUserQuery, [email], (error, results) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      if (results.length === 0) {
        res.status(404).json({ message: "User not found" });
      } else {
        const username = results[0].username;
        res.status(200).json({ username });
      }
    }
  });
});

app.post("/voucher", (req, res) => {
  const { user_uid } = req.body;

  const query = "SELECT * FROM voucher WHERE user_uid = ?";

  db.query(query, [user_uid], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.post("/get-history", (req, res) => {
  const { username } = req.body;

  const getHistoryQuery = "SELECT * FROM pay WHERE username = ?";
  db.query(getHistoryQuery, [username], (error, results) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
    } else {
      if (results.length === 0) {
        res.status(404).json({
          message: "No payment history found for the provided username",
        });
      } else {
        // Emit the payment history to the connected clients

        res.status(200).json({ paymentHistory: results });
      }
    }
  });
});

app.post("/register", (req, res) => {
  const { username, password, email } = req.body;

  const checkEmailQuery = "SELECT COUNT(*) AS count FROM user WHERE email = ?";
  db.query(checkEmailQuery, [email], (emailCheckError, emailCheckResults) => {
    if (emailCheckError) {
      console.error("Error checking email:", emailCheckError);
      return res.sendStatus(500);
    }

    const emailCount = emailCheckResults[0].count;

    if (emailCount > 0) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Continue with username uniqueness check
    const checkUsernameQuery =
      "SELECT COUNT(*) AS count FROM user WHERE username = ?";
    db.query(checkUsernameQuery, [username], (checkError, checkResults) => {
      if (checkError) {
        console.error("Error checking username:", checkError);
        return res.sendStatus(500);
      }

      const usernameCount = checkResults[0].count;

      if (usernameCount > 0) {
        return res.status(400).json({ error: "Username already in use" });
      }

      // If both email and username are not in use, proceed with registration
      const uid = generateUID();
      const insertUserQuery =
        "INSERT INTO user (uid, username, email, password) VALUES (?, ?, ?, ?)";

      db.query(
        insertUserQuery,
        [uid, username, email, password],
        (insertError, insertResults) => {
          if (insertError) {
            console.error("Error registering user:", insertError);
            return res.sendStatus(500);
          } else {
            console.log("User successfully registered");

            // Setelah pengguna terdaftar, berikan voucher
            const voucherCode = generateVoucherCode();
            const discountPercentage = 0.1; // Sesuaikan dengan kebutuhan Anda
            const expirationDate = "2023-12-31"; // Sesuaikan dengan kebutuhan Anda
            const title = "new customer";
            const insertVoucherQuery = `
              INSERT INTO voucher (user_uid, voucher_code, discount_percentage, expiration_date, title , created_at)
              VALUES (?, ?, ?, ?,?, NOW())
            `;

            db.query(
              insertVoucherQuery,
              [uid, voucherCode, discountPercentage, expirationDate, title],
              (voucherInsertError, voucherInsertResults) => {
                if (voucherInsertError) {
                  console.error("Error inserting voucher:", voucherInsertError);
                  return res.sendStatus(500);
                } else {
                  console.log("Voucher successfully added");
                  return res.sendStatus(200);
                }
              }
            );
          }
        }
      );
    });
  });
});

function generateVoucherCode() {
  const prefix = "SUBSCRIBE_DEA_AFRIZAL_";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const codeLength = 5;

  let voucherCode = prefix;
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    voucherCode += characters.charAt(randomIndex);
  }

  return voucherCode;
}
app.post("/check-vouchers", async (req, res) => {
  const voucherCode = req.body.voucherCode;

  if (!voucherCode) {
    return res.status(400).json({ error: "Voucher code is required." });
  }

  try {
    db.query(
      "SELECT user_uid, discount_percentage, is_used FROM voucher WHERE voucher_code = ?",
      [voucherCode],
      (error, rows) => {
        if (error) {
          console.error("Database error:", error);
          return res.status(500).json({ error: "Internal server error." });
        }

        if (rows.length === 0) {
          return res.status(404).json({ error: "Voucher not found." });
        }

        const voucherData = {
          userUid: rows[0].user_uid,
          discountPercentage: rows[0].discount_percentage,
          isUsed: rows[0].is_used,
        };

        // Check if the voucher is already used
        if (voucherData.isUsed) {
          return res.status(403).json({ error: "Voucher is already used." });
        }

        res.json(voucherData);
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/update-voucher", async (req, res) => {
  const { voucherCode } = req.body;

  try {
    // Use a parameterized query to update the voucher status
    const updateResult = await db.query(
      "UPDATE voucher SET is_used = true WHERE voucher_code = ?",
      [voucherCode]
    );

    // Check the result of the update
    if (updateResult.affectedRows > 0) {
      res.json({ message: "Voucher marked as used successfully" });
    } else {
      res.status(404).json({ message: "Voucher not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "putrabahari1006@gmail.com",
      pass: "taletpsmoesjdjfq",
    },
  });

  const generateResetToken = () => {
    const token = crypto.randomBytes(3).toString("hex");
    return token;
  };

  try {
    const resetToken = generateResetToken();
    console.log(resetToken);

    const insertTokenQuery = `UPDATE user SET otp = ? WHERE email = ?`;
    const insertTokenValues = [resetToken, email];

    const mailOptions = {
      from: "omYoo@Studio.com",
      to: email,
      subject: "Reset Password",
      html: `
          <html>
            <head>
              <style>
                /* Tambahkan CSS kustom Anda di sini */
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f0f0f0;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                }
                .header {
                  background-color: #007BFF;
                  color: #ffffff;
                  padding: 10px 0;
                  text-align: center;
                }
                .content {
                  padding: 20px;
                }
                .footer {
                  background-color: #007BFF;
                  color: #ffffff;
                  padding: 10px 0;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Reset Password</h1>
                </div>
                <div class="content">
                  <p>Halo,</p>
                  <p>Anda telah meminta untuk mereset password Anda. Gunakan token berikut untuk mereset password:</p>
                  <p><strong>Token:</strong> ${resetToken}</p>
                  <p>Jika Anda tidak melakukan permintaan ini, silakan abaikan email ini.</p>
                  <p>Salam,</p>
                  <p>Terima Kasih</p>
                </div>
                <div class="footer">
                  &copy; ${new Date().getFullYear()} HKKS
                </div>
              </div>
            </body>
          </html>
        `,
    };

    await transporter.sendMail(mailOptions);

    db.query(insertTokenQuery, insertTokenValues, (error, results) => {
      if (error) {
        console.error(error);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete("/delete-token", (req, res) => {
  const { email } = req.body;
  const deleteTokenQuery = `UPDATE user SET otp = NULL WHERE email = ?`;
  const deleteTokenValues = [email];

  db.query(deleteTokenQuery, deleteTokenValues, (error, results) => {
    if (error) {
      console.error("Error deleting token:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      console.log("Token deleted successfully");
      res.sendStatus(200);
    }
  });
});

app.post("/verify-token", (req, res) => {
  const { otp, email } = req.body;
  const selectOTPQuery = "SELECT otp FROM user WHERE email = ?";

  db.query(selectOTPQuery, [email], (selectError, selectResults) => {
    if (selectError) {
      console.error(selectError);
      res.sendStatus(500);
    } else {
      if (selectResults.length > 0) {
        const storedOTP = selectResults[0].otp;

        if (storedOTP === otp) {
          res.sendStatus(200);
        } else {
          console.log(otp);
          res.sendStatus(400);
        }
      } else {
        console.log("Email not found");
        res.sendStatus(400);
      }
    }
  });
});

app.post("/update-password", (req, res) => {
  const { email, newPassword } = req.body;
  const updatePasswordQuery = "UPDATE user SET password = ? WHERE email = ?";
  const updatePasswordValues = [newPassword, email];

  db.query(updatePasswordQuery, updatePasswordValues, (error, results) => {
    if (error) {
      console.error("Error updating password:", error);
      res.sendStatus(500);
    } else {
      console.log("Password updated successfully");
      res.sendStatus(200);
    }
  });
});

app.post("/jwt", async (req, res) => {
  const { token } = req.body;

  const query = "SELECT username FROM user WHERE token_jwt = ?";

  db.query(query, [token], (error, results) => {
    if (error) {
      console.error("Database query error:", error);
      return res.status(500).send("Internal Server Error");
    }

    if (results.length > 0) {
      const tokenJWT = results[0].token_jwt;
      return res.status(200).json({ tokenJWT, isLogin: true });
    } else {
      return res.status(404).json({ isLogin: false });
    }
  });
});

app.post("/check-email", (req, res) => {
  const { email } = req.body;

  const sql = "SELECT * FROM user WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    if (result.length > 0) {
      res.status(200).json({ exists: true });
    } else {
      res.status(200).json({ exists: false });
    }
  });
});

app.listen(3001, () => {
  console.log(`Server berjalan `);
});
