const express = require('express')
const path = require('path')
var logger = require('morgan');
require('dotenv').config()
const mongoose = require("mongoose");
const nocache = require('nocache')
const session = require('express-session')
const MongoStore = require('connect-mongo');
const cookieParser = require("cookie-parser");

const app = express()
const PORT = 3000;

// Only apply preventCache to routes, NOT static files
app.use((req, res, next) => {
  const isStaticAsset = req.url.startsWith('/assets') || req.url.startsWith('/uploads');
  if (!isStaticAsset) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

const connect = mongoose.connect(process.env.MONGODB)
connect
.then(()=>{
    console.log("MongoDB is connected successfully");
})
.catch((error)=>{
    console.log("Error connecting to MongoDB",error);
})

const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const paymentRouter = require('./routes/paymentRouter')

//setting ejs
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
//url encoding
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//using nocache for session management
app.use(nocache());

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SECRET_KEY || "supersecretkey12345",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB,
    }),
    cookie: {
      sameSite: "lax",                           // ✅ allows cross-site POST redirects
      secure: process.env.NODE_ENV === "production", // ✅ true only in HTTPS prod
    },
  })
);

  app.use('/uploads', express.static(path.join(__dirname, "public")));
  app.use("/admin", express.static(path.join(__dirname, "public")));
  app.use("/", express.static(path.join(__dirname, "public")));
  app.use(express.static(path.join(__dirname, "uploads")));

  app.use('/',userRouter); 
  app.use('/admin',adminRouter);
  app.use('/payment', paymentRouter);
  
  app.use((req,res,next)=>{
    res.status(404).render("error");
})  
  
app.listen(PORT,()=>{
    console.log(`Server on http://localhost:${PORT}`);
})