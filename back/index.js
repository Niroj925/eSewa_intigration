const express = require("express");
const bodyParser = require("body-parser");
const cors=require('cors')
const connectToMongo = require("./db");
const app = express();
const { getEsewaPaymentHash, verifyEsewaPayment } = require("./esewa");
const Payment = require("./paymentModel");
const Item = require("./itemModel");
const PurchasedItem = require("./purchasedItemModel");

app.use(cors("*"));

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
app.use(bodyParser.json());

connectToMongo();

app.post("/initialize-esewa", async (req, res) => {
  try {
    const { itemId, totalPrice } = req.body;
   console.log(req.body);
    const itemData = await Item.findOne({
      _id: itemId,
      price: Number(totalPrice),
    });

    if (!itemData) {
      return res.status(400).send({
        success: false,
        message: "item not found",
      });
    }
    const purchasedItemData = await PurchasedItem.create({
      item: itemId,
      paymentMethod: "esewa",
      totalPrice: totalPrice,
    });
    const paymentInitate = await getEsewaPaymentHash({
      amount: totalPrice,
      transaction_uuid: itemId,
    });
    console.log(paymentInitate);
    res.json({
      success: true,
      payment: paymentInitate,
      purchasedItemData,
    });
  } catch (error) {
    res.json({
      success: false,
      error,
    });
  }
});

// to verify payment this is our `success_url`
app.get("/complete-payment", async (req, res) => {
  const { data } = req.query;

  try {
    const paymentInfo = await verifyEsewaPayment(data);
    console.log(paymentInfo);
   
    const purchasedItemData = await PurchasedItem.findOneAndUpdate(
      { item: paymentInfo.response.transaction_uuid },         
      { $set: { status: 'success' } },    
      { new: true }                      
    );
    console.log("item:", purchasedItemData);
    if (!purchasedItemData) {
      res.status(500).json({
        success: false,
        message: "Purchase not found",
      });
    }
    // Create a new payment record
    const paymentData = await Payment.create({
      pidx: paymentInfo.decodedData.transaction_code,
      transactionId: paymentInfo.decodedData.transaction_code,
      productId: paymentInfo.response.transaction_uuid,
      amount: purchasedItemData.totalPrice,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: "esewa",
      status: "success",
    });

    //updating purchased record
    await PurchasedItem.findByIdAndUpdate(
      paymentInfo.response.transaction_uuid,
      {
        $set: {
          status: "completed",
        },
      }
    );
    // Send success response
    res.json({
      success: true,
      message: "Payment Successful",
      paymentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error,
    });
  }
});

app.post("/create-item", async (req, res) => {
  const { name, price } = req.body;
  let itemData = await Item.create({
    name,
    price,
    inStock: true,
    category: "vayo pardaina",
  });
  console.log(itemData);
  res.json({
    success: true,
    item: itemData,
  });
});

app.get("/find-purchase", async (req, res) => {
  const purchaseItems = await PurchasedItem.find();
  res.status(200).json(purchaseItems);
});

app.delete("/delete", async (req, res) => {
  const result = await PurchasedItem.deleteMany({});
  res.status(200).json({
    message: `${result.deletedCount} items deleted successfully!`,
  });
});

app.get("/test", function (req, res) {
  res.sendFile(__dirname + "/test.html");
});

app.get("/front", function (req, res) {
  res.sendFile(__dirname + "/front.html");
});

app.get("/test2", function (req, res) {
  res.sendFile(__dirname + "/test2.html");
});
app.listen(3001, () => {
  console.log("Backend listening at http://localhost:3001");
});
