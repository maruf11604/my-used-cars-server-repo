const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
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

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.post("/sellers", async (req, res) => {
      const user = req.body;
      const result = await sellersCollection.insertOne(user);
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
