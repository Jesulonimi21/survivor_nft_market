import express = require("express");
import  { auth, nft }  from "./routes/index";
// import multer from "multer";
import path from "path";



// const fileStorage = multer.diskStorage({
//   destination: (_req, _file, cb) =>{
//     cb(null, "images")
// },
// filename: (_req, file, cb) =>{
//     cb(null, new Date().toISOString() + "-" + file.originalName)
// }, 
// });

// const fileFilter = (req, file, cb) => {
//   if(file.mimetype == "image/png"){
//     cb(null, true);
//   }else{
//     cb(null, false);
//   }
// }


const app = express();
app.use(express.json());
// app.use(multer({storage: fileStorage, fileFilter}).single("image"));
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use((req, res, next) =>{
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(auth);
app.use(nft);






export default app.listen(7001);;