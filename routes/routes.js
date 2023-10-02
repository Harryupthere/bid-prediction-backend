const jwt = require("jsonwebtoken");
const axios = require("axios");
var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
const { validationResult } = require("express-validator");

// ---------------Controllers--------
const testnetApi = require("../controllers/testnetApi");
const middlewares = require("../middlewares/middlewares");
const User = require("../Models/User");
const BetTransaction = require("../Models/Transaction");
const RequestWithdrawal = require("../Models/Request");
const UserWithdrawal = require("../Models/WithdrawalTransaction");
const Rate = require("../Models/Rate");
const Admin = require("../Models/Admin");
// ==================================

// test.mint();

router.use(bodyParser.json());
router.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// =======Wallet Create Testnet============================================
// router.post('/testnet/exicuteTransaction',testnetApi.exicuteTransaction.bind(this));
// router.post('/testnet/fetchTree',testnetApi.fetchTree.bind(this));

// ============== AUTHENTICATION API ===============
router.post("/signup", middlewares.validateSignupData, testnetApi.signup);
router.post("/login", middlewares.validateLoginData, testnetApi.login);
router.post(
  "/forgot-password",
  middlewares.validateEmail,
  testnetApi.forgotPassword
);
router.post(
  "/reset-password",
  middlewares.validateResetPasswordData,
  testnetApi.resetPassword
);

// =============== User API ==================
router.put("/deposit", middlewares.verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!req.body.amount || req.body.amount == 0) {
      return res.status(400).json({ message: "Invalid deposit amount!" });
    }

    console.log(req.user);
    const find = await User.findOne({ email: req.user.email });
    // console.log(find);
    const deposit = new UserWithdrawal({
      amount: amount,
      transType: "deposit",
    });
    find.transactions.push(deposit);
    await find.save();
    deposit.userId.push(find);
    await deposit.save();
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user.userId,
      },
      {
        $inc: {
          wallet: amount,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    return res.status(200).json({
      message: "Amount deposited successfully!",
      balance: updatedUser.wallet,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// router.put("/withdraw", middlewares.verifyToken, testnetApi.withdraw);

// router.get("/", function (request, response) {
//   response.contentType("routerlication/json");
//   response.end(JSON.stringify("Node is running"));
// });

// router.get("*", function (req, res) {
//     return res.status(200).json({
//         code: 404,
//         data: null,
//         msg: "Invalid Request {URL Not Found}",
//     });
// });

router.post("/adminlogin", async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find the user by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if the provided password matches the hashed password in the database

    if (admin.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token with the user's ID as the payload
    const token = jwt.sign(
      { userId: admin._id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      {
        expiresIn: "3h", // Token expires in 1 hour (adjust as needed)
      }
    );

    // Saving token in the user document
    admin.token = token;
    await admin.save();

    return res
      .status(200)
      .json({
        message: "User login successful!",
        token,
        adminId: admin._id,
        email: admin.email,
        role: "admin",
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/updaterate", middlewares.verifyToken, async (req, res) => {
  console.log(req.user);
  if (req.user.role === "admin") {
    const updateRate = await Rate.findOneAndUpdate(
      { role: req.user.role },
      {
        $set: {
          rate: req.body.rate,
        },
      },
      {
        new: true,
      }
    );
    console.log(updateRate)
  }
  res.send(`Rate has been changed to ${req.body.rate}`);
});

router.post("/bet", middlewares.verifyToken, async (req, res) => {
  const { time, amount, prediction } = req.body;
  const find = await User.findOne({ email: req.user.email });
  const currentRate = await Rate.findOne({});
  const rate = parseFloat(currentRate.rate);
  if (find.wallet > req.body.amount) {
    const updatedAmount = parseFloat(find.wallet) - parseFloat(req.body.amount);
    //  console.log(updatedAmount)
    const update = await User.findOneAndUpdate(
      {
        email: req.user.email,
      },
      {
        $set: {
          wallet: updatedAmount,
        },
      },
      {
        new: true,
      }
    );
    const transaction = new BetTransaction({
      prediction: prediction,
      amount: amount,
      duration: time,
      result: "Pending",
      profit: 0,
    });
    update.betTransactions.push(transaction);
    await update.save();
    transaction.userId.push(update);
    await transaction.save();
    try {
      // Fetch the current BTC/USD price from an external API
      const binanceApiUrl =
        "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
      const initialResponse = await axios.get(binanceApiUrl);
      const initialPrice = parseFloat(initialResponse.data.price);

      // Set up a setTimeout to fetch the current BTC/USD price after the specified time
      setTimeout(async () => {
        const updatedResponse = await axios.get(binanceApiUrl);
        const updatedPrice = parseFloat(updatedResponse.data.price);

        // Determine the outcome based on user prediction and price change
        let result;
        if (prediction === "rise" && updatedPrice > initialPrice) {
          result = "win";
          // console.log("object")
          const user = await User.findOne({ email: req.user.email });
          const rate = await Rate.findOne({});

          const walletAsNumber = parseFloat(user.wallet);
          const profit = (parseFloat(amount) * rate) / 100;
          const updatedAmount =
            walletAsNumber +
            parseFloat(amount) +
            (parseFloat(amount) * rate) / 100;
          const userUpdate = await User.findOneAndUpdate(
            {
              email: req.user.email,
            },
            {
              $set: {
                wallet: updatedAmount,
              },
            },
            {
              new: true,
            }
          );
          const updateTransStaus = await BetTransaction.findByIdAndUpdate(
            transaction.id,
            {
              $set: {
                result: result,
                profit: profit,
              },
            },
            {
              new: true,
            }
          );
        } else if (prediction === "fall" && updatedPrice < initialPrice) {
          result = "win";
          const user = await User.findOne({ email: req.user.email });
          const walletAsNumber = parseFloat(user.wallet);
          const profit = (parseFloat(amount) * rate) / 100;
          const updatedAmount =
            walletAsNumber +
            parseFloat(amount) +
            (parseFloat(amount) * rate) / 100;
          const userUpdate = await User.findOneAndUpdate(
            {
              email: req.user.email,
            },
            {
              $set: {
                wallet: updatedAmount,
              },
            },
            {
              new: true,
            }
          );
          const updateTransStaus = await BetTransaction.findByIdAndUpdate(
            transaction.id,
            {
              $set: {
                result: result,
                profit: profit,
              },
            },
            {
              new: true,
            }
          );
        } else if (prediction === "fall" && updatedPrice == initialPrice) {
          result = "draw";
          const user = await User.findOne({ email: req.user.email });
          const walletAsNumber = parseFloat(user.wallet);
          const updatedAmount = walletAsNumber + parseFloat(amount);
          const userUpdate = await User.findOneAndUpdate(
            {
              email: req.user.email,
            },
            {
              $set: {
                wallet: updatedAmount,
              },
            },
            {
              new: true,
            }
          );
          const updateTransStaus = await BetTransaction.findByIdAndUpdate(
            transaction.id,
            {
              $set: {
                result: result,
                profit: 0,
              },
            },
            {
              new: true,
            }
          );
        } else if (prediction === "rise" && updatedPrice == initialPrice) {
          result = "draw";
          const user = await User.findOne({ email: req.user.email });
          const walletAsNumber = parseFloat(user.wallet);
          const updatedAmount = walletAsNumber + parseFloat(amount);
          const userUpdate = await User.findOneAndUpdate(
            {
              email: req.user.email,
            },
            {
              $set: {
                wallet: updatedAmount,
              },
            },
            {
              new: true,
            }
          );
          const updateTransStaus = await BetTransaction.findByIdAndUpdate(
            transaction.id,
            {
              $set: {
                result: result,
                profit: 0,
              },
            },
            {
              new: true,
            }
          );
        } else {
          const userUpdate = await User.findOne({ email: req.user.email });
          result = "loss";
          const updateTransStaus = await BetTransaction.findByIdAndUpdate(
            transaction.id,
            {
              $set: {
                result: result,
                profit: 0,
              },
            },
            {
              new: true,
            }
          );
        }
        // Send the result back to the user
        res.json({ result, find, initialPrice, updatedPrice });
      }, time * 1000); // Convert time to milliseconds
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "An error occurred" });
    }
  } else {
    res.status(404).json({ message: "Insufficient Balance" });
  }
});

router.post("/withdrawalrequest", middlewares.verifyToken, async (req, res) => {
  const { amount, walletAddress } = req.body;
  const find = await User.findOne({ email: req.user.email });

  if (find.wallet > amount) {
    try {
      const updatedBalance = parseFloat(find.wallet) - parseFloat(amount);
      if (find.wallet > amount) {
        const update = await User.findOneAndUpdate(
          { email: req.user.email },
          {
            $set: {
              wallet: updatedBalance,
            },
          },
          {
            new: true,
          }
        );

        const generateRequest = new RequestWithdrawal({
          email: req.user.email,
          amount: amount,
          balance: find.wallet,
          walletAddress: walletAddress,
        });
        generateRequest.userId.push(find);
        await generateRequest.save();
        res.json({
          message: `Your request for withdrawal ${amount} has been placed successfully`,
        });
      } else {
        res.status(400).json({ message: "Insufficient Balance" });
      }
    } catch (error) {
      res.status(500).json({ message: "An error occurred" });
    }
  } else {
    res.status(400).send("Insuficient Balance");
  }
});

router.post("/withdrawalstatus", async (req, res) => {
  const { amount, email, transStatus, requestId, walletAddress } = req.body;
  const find = await User.findOne({ email: email });
  const request = await RequestWithdrawal.findById(requestId);
  if (find.wallet > amount) {
    if (request !== null) {
      if (transStatus === "Approve") {
        const withdrawal = new UserWithdrawal({
          amount: amount,
          transType: "withdrawal",
          transStatus: transStatus,
          walletAddress: walletAddress,
        });
        find.transactions.push(withdrawal);
        await find.save();
        withdrawal.userId.push(find);
        await withdrawal.save();
        const updatedbalance = parseFloat(find.wallet) - parseFloat(amount);
        const update = await User.findOneAndUpdate(
          { email: email },
          {
            $set: {
              wallet: updatedbalance,
            },
          },
          {
            new: true,
          }
        );

        const deleteRequest = await RequestWithdrawal.findByIdAndDelete(
          requestId
        );
        res.status(200).send("Request has been approved sucessfully");
      } else if (transStatus === "Reject") {
        const revertBalance = parseFloat(find.wallet) + parseFloat(amount);
        const revert = await User.findOneAndUpdate(
          { email: email },
          {
            $set: {
              wallet: revertBalance,
            },
          },
          {
            new: true,
          }
        );
        const withdrawal = new UserWithdrawal({
          amount: amount,
          transType: "withdrawal",
          transStatus: transStatus,
        });
        withdrawal.userId.push(find);
        console.log(withdrawal);
        await withdrawal.save();
        find.transactions.push(withdrawal);
        await find.save();

        const deleteRequest = await RequestWithdrawal.findByIdAndDelete(
          requestId
        );
        res.send("Request has been rejected");
      }
    } else {
      res.status(400).send("Invalid Request");
    }
  } else {
    res.status.send("Insuficient Balance");
  }
});

router.get("/getuserdetails", async (req, res) => {
  const find = await User.findOne({ email: req.query.email });
  res.send(find);
});
router.get("/getrate", async (req, res) => {
  const find = await Rate.findOne({});
  res.send(find);
});

router.get("/getallrequests", async (req, res) => {
  const find = await RequestWithdrawal.find({});
  console.log(find);
  res.send(find);
});

router.get("/allbettransactions", async (req, res) => {
  const find = await BetTransaction.find({});
  res.send(find);
});

router.get("/bettransactions", async (req, res) => {
  const { userId } = req.query;
  const find = await BetTransaction.find({ userId: userId });
  res.send(find);
});

router.get("/transactionofuser", async (req, res) => {
  const { userId } = req.query;
  const find = await UserWithdrawal({ userId: userId });
  res.send(find);
});

function ensureWebToken(req, res, next) {
  const x_access_token = req.headers["authorization"];
  if (typeof x_access_token !== undefined) {
    req.token = x_access_token;
    verifyJWT(req, res, next);
  } else {
    res.sendStatus(403);
  }
}

async function verifyJWT(req, res, next) {
  jwt.verify(req.token, config.JWT_SECRET_KEY, async function (err, data) {
    if (err) {
      res.sendStatus(403);
    } else {
      const _data = await jwt.decode(req.token, {
        complete: true,
        json: true,
      });
      req.user = _data["payload"];
      next();
    }
  });
}

module.exports.routes = router;
