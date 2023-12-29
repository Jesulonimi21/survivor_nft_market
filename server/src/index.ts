import express = require("express");
import  { auth }  from "./routes/index";
var app = express();
app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(auth);
app.use((req, res, next) =>{
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next()
})



app.listen(7001);
