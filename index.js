const express = require('express')
var logger = require('morgan');
require('dotenv').config()
const app = express()
const PORT = 3000;
const path = require('path')
const nocache = require('nocache')
const session = require('express-session')
const fetchUserDetails = require('./middleware/user'); 

const preventCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};
app.use(preventCache);
const userRouter = require('./routes/userRouter')

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

  app.use('/uploads', express.static('public/uploads'));
//   app.use("/admin", express.static("public/adminAssets"));
  app.use("/", express.static("public/"));
  app.use(express.static('uploads'))
 
  app.use(fetchUserDetails);
  app.use('/',preventCache,userRouter); 
//   app.use('/admin',adminRouter);

  
app.listen(PORT,()=>{
    console.log(`Server on http://localhost:${PORT}`);
})