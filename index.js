const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    app.get("/productOptions", async (req, res) => {
      const query = {};
      const options = await productOptionCollection.find(query).toArray();
      res.send(options);
    });
  } finally {
  }
}
run().catch(console.log());

app.get("/", async (req, res) => {
  res.send("used resale market server is running");
});

app.listen(port, () => console.log(`used resale running on ${port}`));
