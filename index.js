const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dotenv = require('dotenv')
const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
dotenv.config()
const app = express();
const PORT = process.env.PORT
const uri = process.env.MONGODB_URI


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

    const db = client.db("mediqueue")
    const tutorCollection = db.collection("tutors")

    app.post('/tutor', async (req,res)=>{
      const tutor = req.body
      const result = await tutorCollection.insertOne(tutor)
      res.json(result)
    })



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