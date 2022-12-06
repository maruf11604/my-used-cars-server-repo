const express = require("express");

const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
//middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hai1jds.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    console.log(err, decoded);
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productOptionCollection = client
      .db("usedProductsMarket")
      .collection("productOptions");

    const bookingsCollection = client
      .db("usedProductsMarket")
      .collection("bookings");
    const usersCollection = client.db("usedProductsMarket").collection("users");
    const sellersCollection = client
      .db("usedProductsMarket")
      .collection("sellers");
    const addProductCollection = client
      .db("usedProductsMarket")
      .collection("addproducts");
    const paymentsCollection = client
      .db("usedProductsMarket")
      .collection("payments");
    //verify Admin
    const verifyAdmin = async (req, res, next) => {
      console.log("inside verifyAdmin", req.decoded.email);
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //product option ------------------
    app.get("/productOptions", async (req, res) => {
      const query = {};
      const options = await productOptionCollection.find(query).toArray();
      res.send(options);
    });

    app.get("/productOptions/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const buying = await productOptionCollection.findOne(query);
      res.send(buying);
    });

    //bookings----------------------

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden" });
      // }

      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
      console.log(bookings);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const data = req.body;
      const price = data.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.dataId;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updateResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );

      res.send(result);
    });

    //jwt-----------------------

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    //users---------------

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      console.log(user);
      res.send({ isSeller: user?.person === "Seller" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/admin/:id", async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //delete user
    app.delete("/users/:id", verifyJwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
      console.log(result);
    });

    //seller------------------

    app.get("/addproducts", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden" });
      }
      const query = { email: email };
      const myProduct = await addProductCollection.find(query).toArray();
      res.send(myProduct);
      // console.log(myProduct);
    });

    app.get("/sellers", verifyJwt, async (req, res) => {
      const query = {};
      const result = await sellersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/sellers", async (req, res) => {
      const user = req.body;
      const result = await sellersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/sellers/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await sellersCollection.deleteOne(filter);
      res.send(result);
    });

    //product--------------

    app.get("/addproducts", async (req, res) => {
      const query = {};
      const result = await addProductCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/addproducts", async (req, res) => {
      const product = req.body;
      const result = await addProductCollection.insertOne(product);
      res.send(result);
    });

    app.delete("/addproducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await addProductCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log());

app.get("/", async (req, res) => {
  res.send("used resale market server is running");
});

app.listen(port, () => console.log(`used resale running on ${port}`));
