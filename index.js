const express = require("express");
const db = require("./koneksi");
const bodyParser = require("body-parser");
const app = express();
const port = 3005;
const cors = require("cors");
const jwt = require("jsonwebtoken");

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

// app.post("/order", async (req, res) => {
//   const { id_product, nm_product, price, qty, email, time, image } = req.body;

//   if (!id_product || !nm_product || !price || !email) {
//     console.log("Please fill in all fields");
//     return res.status(400).json({ error: "Please fill in all fields" });
//   }
//   console.log(price);

//   const snap = new midtransClient.Snap({
//     isProduction: false,
//     serverKey: "SB-Mid-server-BGYfA4SBqkbbDqAgycBbBqIB",
//     clientKey: "SB-Mid-client-LAESY4DvSHanXr5C",
//   });

//   const transactionDetails = {
//     order_id: `ORDER_${Math.round(Math.random() * 100000)}`,
//     gross_amount: price,
//     email: email,
//   };

//   const transaction = {
//     transaction_details: transactionDetails,
//     customer_details: {
//       email: email,
//       first_name: "Testing",
//     },
//   };

//   try {
//     const transactionToken = await snap.createTransaction(transaction);
//     const paymentToken = transactionToken.token;
//     console.log("Payment token:", paymentToken);
//     const maxLength = 50;
//     const trimmedName = nm_product.substring(0, maxLength);

//     const paymentData = {
//       transaction_details: transactionDetails,
//       customer_details: {
//         email: email,
//         first_name: "Testing",
//       },
//       seller_details: {
//         id: "sellerId-01",
//         name: "Ario Novrian",
//         email: "omyoo@studio.com",
//         url: "https://www.omyoo-studio.online/",
//         address: {
//           first_name: "Ario",
//           last_name: "Novrian",
//           phone: "089680768061",
//           address: "Jl Karya Tani",
//           city: "Ketapang",
//           postal_code: "78813",
//           country_code: "IDN",
//         },
//       },
//       item_details: [
//         {
//           price: price,
//           quantity: qty,
//           name: trimmedName,
//         },
//       ],
//     };

//     const paymentResponse = await snap.createTransaction(paymentData);
//     const redirectUrl = paymentResponse.redirect_url;

//     const insertOrderQuery =
//       "INSERT INTO pay (order_id, id_product, image,nm_product, price, qty, email, time) VALUES (?, ?, ?, ?, ?, ?, ?,?)";
//     const values = [
//       transactionDetails.order_id,
//       id_product,
//       image,
//       nm_product,
//       price,
//       qty,
//       email,
//       time,
//     ];

//     db.query(insertOrderQuery, values, (error, results) => {
//       if (error) {
//         console.error("Error placing order:", error);
//         return res.status(500).json({ error: "Error placing order" });
//       }
//       console.log("Order placed successfully:", results);

//       res
//         .status(200)
//         .json({ order_id: transactionDetails.order_id, redirectUrl });
//     });
//   } catch (error) {
//     console.error("Failed to create transaction:", error);
//     res.status(500).json({ error: "Failed to create transaction" });
//   }
// });

// app.post("/order", async (req, res) => {
//     const { items, email } = req.body;

//     if (!items || items.length === 0 || !email) {
//       console.log("Please provide valid order details");
//       return res
//         .status(400)
//         .json({ error: "Please provide valid order details" });
//     }

//     // Nilai tukar kurs dari dollar ke rupiah
//     const exchangeRate = 15000; // Gantilah dengan nilai tukar kurs yang sesuai

//     // Mengonversi harga dari dollar ke rupiah
//     const convertToIDR = (priceInDollar) => {
//       return priceInDollar * exchangeRate;
//     };

//     const snap = new midtransClient.Snap({
//       isProduction: false,
//       serverKey: "SB-Mid-server-BGYfA4SBqkbbDqAgycBbBqIB",
//       clientKey: "SB-Mid-client-LAESY4DvSHanXr5C",
//     });

//     try {
//       // Log the entire cart
//       const transactionTokens = await Promise.all(
//         items.map(async (item) => {
//           // Konversi harga dari dollar ke rupiah
//           const priceInIDR = convertToIDR(item.price);

//           const transaction = {
//             transaction_details: {
//               order_id: `ORDER_${Math.round(Math.random() * 100000)}`,
//               gross_amount: priceInIDR, // Gunakan harga dalam rupiah
//               email: email,
//             },
//             customer_details: {
//               email: email,
//               first_name: "Testing",
//             },
//             item_details: [
//               {
//                 price: priceInIDR, // Gunakan harga dalam rupiah
//                 quantity: item.qty,
//                 name: item.nm_product,
//               },
//             ],
//           };

//           console.log("Data to be paid for item:", item);
//           console.log("Transaction details:", transaction);

//           // Create Midtrans transaction
//           return await snap.createTransaction(transaction);

//         })

//       );
//       const insertOrderQuery =
//       "INSERT INTO pay (order_id, id_product, image, nm_product, price, qty, email, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
//     const values = [
//       transaction.transaction_details.order_id,
//       item.id_product,
//       item.image,
//       item.nm_product,
//       priceInIDR,
//       item.qty,
//       email,
//       // Assuming 'time' is available in the 'item' object
//     ];

//     // Execute the SQL queries using Promise.all
//     await Promise.all(
//       transactionTokens.map(async (transactionToken) => {
//         // Insert order data into the database
//         await new Promise((resolve, reject) => {
//           db.query(insertOrderQuery, values, (error, results) => {
//             if (error) {
//               console.error("Error placing order:", error);
//               reject(error);
//             } else {
//               console.log("Order placed successfully:", results);
//               resolve();
//             }
//           });
//         });
//       })
//     );

//       const redirectUrls = transactionTokens.map(
//         (transactionToken) => transactionToken.redirect_url
//       );

//       const responseData = {
//         redirectUrl: redirectUrls.length > 0 ? redirectUrls[0] : null,
//       };

//       console.log("Response Data:", responseData);

//       res.status(200).json(responseData);
//     } catch (error) {
//       console.error("Failed to create transaction:", error);
//       res.status(500).json({ error: "Failed to create transaction" });
//     }
//   });

function generateOrderId() {
  const timestamp = new Date().getTime();
  const randomPart = Math.round(Math.random() * 100000);
  return `IKKEA_${timestamp}_${randomPart}`;
}

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

  const order_id = generateOrderId();

  const exchangeRate = 15000;

  const convertToIDR = (priceInDollar) => {
    return priceInDollar * exchangeRate;
  };

  try {
    const transactionsData = await Promise.all(
      items.map(async (item) => {
        const priceInIDR = convertToIDR(item.price);

        const transaction = {
          transaction_details: {
            order_id: order_id,
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
          itemData: {
            order_id: order_id,
            id_product: item.id_product,
            image: item.image,
            nm_product: item.nm_product,
            price: priceInIDR,
            qty: item.qty,
            email: email,
            username: item.username,
          },
        };
      })
    );

    const insertOrderQuery =
      "INSERT INTO pay (order_id, id_product, image, nm_product, price, qty, email, time , username) VALUES (?, ?, ?, ?, ?, ?, ?, NOW() , ?)";

    await Promise.all(
      transactionsData.map(async (transactionData) => {
        const { snapTransaction, itemData } = transactionData;

        await new Promise((resolve, reject) => {
          db.query(
            insertOrderQuery,
            Object.values(itemData),
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

    // Anda dapat melanjutkan dengan mengambil redirect_url atau respons lainnya dari token pembayaran pertama
    const redirectUrl = transactionsData[0].snapTransaction.redirect_url;

    const responseData = {
      redirectUrl: redirectUrl,
      order_id: order_id,
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

  const getOrderStatusQuery = "SELECT * FROM orders WHERE order_id = ?";
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
    const updateStatusQuery = "UPDATE orders SET status = ? WHERE order_id = ?";
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
          const token = jwt.sign(
            { userId: user.uid, email: user.email },
            "rahasia-kunci-jwt",
            { expiresIn: "1h" }
          );

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
                res
                  .status(200)
                  .json({ message: "login", token, username: user.username });
              }
            }
          );
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
            return res.sendStatus(200);
          }
        }
      );
    });
  });
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

    const insertTokenQuery = `UPDATE auth SET otp = ? WHERE email = ?`;
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
                  &copy; ${new Date().getFullYear()} IKKEA
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

app.listen(port, () => {
  console.log(`Server berjalan `);
});
