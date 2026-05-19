const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const PORT = 5000
const uri = "mongodb+srv://mediquee:hRI2t5TB3qvoNey0@cluster0.zpyhg2l.mongodb.net/?appName=Cluster0";

// mediquee
// hRI2t5TB3qvoNey0
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) =>{
  res.send("server is running")
})

app.listen(PORT,()=>{
  console.log(`server running on port ${PORT}`);
  
})