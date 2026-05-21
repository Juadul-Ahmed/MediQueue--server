const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "https://medi-queue-amber.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const clientUrl = process.env.CLIENT_URL || "https://medi-queue-amber.vercel.app";
const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

// Middleware Token Verification
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: No Header provided" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token missing" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload; 
    next();
  } catch (error) {
    console.error("JWT validation error context:", error.message);
    return res.status(403).json({ message: "Forbidden: Invalid session token" });
  }
};


let db, tutorCollection, bookingCollection;

async function initializeDatabase() {
  if (!db) {
  
    await client.connect();
    db = client.db("mediqueue");
    tutorCollection = db.collection("tutors");
    bookingCollection = db.collection("bookings");
    console.log("Connected to MongoDB successfully!");
  }
  return { tutorCollection, bookingCollection };
}

const ensureDb = async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database unavailable" });
  }
};



app.get('/tutor', ensureDb, async (req, res) => {
  const rawResult = await tutorCollection.find().limit(6).toArray();
  const formattedResult = rawResult.map(tutor => ({
    ...tutor,
    totalSlots: parseInt(tutor.totalSlots) || 0,
    hourlyFee: parseFloat(tutor.hourlyFee) || 0   
  }));
  res.json(formattedResult);
});

// app.get('/tutor/all', ensureDb, async (req, res) => {
//   const { search, startDate, endDate } = req.query;
//   let query = {};

//   if (search) {
//     query.$or = [
//       { tutorName: { $regex: search, $options: 'i' } },
//       { subject: { $regex: search, $options: 'i' } }
//     ];
//   }

//   if (startDate || endDate) {
//     query.sessionStartDate = {};
//     if (startDate) query.sessionStartDate.$gte = startDate;
//     if (endDate) query.sessionStartDate.$lte = endDate;
//   }

//   const rawResult = await tutorCollection.find(query).toArray();
  
//   const formattedResult = rawResult.map(tutor => ({
//     ...tutor,
//     totalSlots: parseInt(tutor.totalSlots) || 0, 
//     hourlyFee: parseFloat(tutor.hourlyFee) || 0    
//   }));

//   res.json(formattedResult);
// });

app.get('/tutor/all', ensureDb, async (req, res) => {

  const { search, startDate, endDate } = req.query;
  let query = {};


  if (search && search.trim() !== "") {
    query.$or = [
      { tutorName: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } }
    ];
  }

  if ((startDate && startDate.trim() !== "") || (endDate && endDate.trim() !== "")) {
    query.sessionStartDate = {};
    if (startDate && startDate.trim() !== "") query.sessionStartDate.$gte = startDate;
    if (endDate && endDate.trim() !== "") query.sessionStartDate.$lte = endDate;
  }

  try {
   
    const rawResult = await tutorCollection.find(query).toArray();
    
    const formattedResult = rawResult.map(tutor => ({
      ...tutor,
      totalSlots: parseInt(tutor.totalSlots) || 0, 
      hourlyFee: parseFloat(tutor.hourlyFee) || 0    
    }));

    res.json(formattedResult);
  } catch (err) {
    console.error("Search directory error:", err);
    res.status(500).json({ error: "Failed to query directory data records." });
  }
});


app.get('/tutor/:id', ensureDb,  async (req, res) => {
  const { id } = req.params;
  try {
    const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
    if (!result) return res.status(404).json({ message: "Instructor not found" });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Malformed ID string structure" });
  }
});

app.post('/tutor', ensureDb, async (req, res) => {
  const tutor = req.body;
  const result = await tutorCollection.insertOne(tutor);
  res.json(result);
});

app.patch('/tutor/:id', ensureDb, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.json(result);
});

app.delete('/tutor/:id', ensureDb, async (req, res) => {
  const { id } = req.params;
  const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
});

app.delete('/booking/:bookingId', ensureDb, verifyToken, async (req, res) => {
  const { bookingId } = req.params;
  const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
  res.json(result);
});

app.post('/booking', ensureDb, verifyToken, async (req, res) => {
  const bookingData = req.body;
  const { tutorId } = bookingData;

  const bookingResult = await bookingCollection.insertOne(bookingData);
  const updateResult = await tutorCollection.updateOne(
    { _id: new ObjectId(tutorId) }, 
    { $inc: { totalSlots: -1 } } 
  );

  res.json({
    success: true,
    bookingResult,
    updateResult
  });
});

app.get('/booking/:userId', ensureDb, verifyToken, async (req, res) => {
  const { userId } = req.params;
  const result = await bookingCollection.find({ userId: userId }).toArray();
  res.json(result);
});

app.get('/', (req, res) => {
  res.send("MediQueue Production Server is fully online and responsive.");
});

// Fire up server initialization
app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});