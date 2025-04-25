const express = require('express')
var logger = require('morgan');
require('dotenv').config()
const app = express()
const PORT = 3000;
const path = require('path')
const nocache = require('nocache')
const session = require('express-session')

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

const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')

const mongoose = require("mongoose");
const connect = mongoose.connect(process.env.MONGODB)
connect
.then(()=>{
    console.log("MongoDB is connected successfully");
})
.catch((error)=>{
    console.log("Error connecting to MongoDB",error);
})

//setting ejs
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
//url encoding
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//using nocache for session management
app.use(nocache());

//using session
app.use(
    session({
      secret: "secret key",
      resave: false,
      saveUninitialized: true,
    })
  ); 

  app.use('/uploads', express.static(path.join(__dirname, "public")));
  app.use("/admin", express.static(path.join(__dirname, "public")));
  app.use("/", express.static(path.join(__dirname, "public")));
  app.use(express.static(path.join(__dirname, "uploads")));

  app.use('/',userRouter); 
  app.use('/admin',adminRouter);
  app.use((req,res,next)=>{
    res.status(404).render("error");
})  
  
app.listen(PORT,()=>{
    console.log(`Server on http://localhost:${PORT}`);
})