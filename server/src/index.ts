import express from "express";
import  { auth, nft }  from "./routes/index";
import multer from "multer";
import path from "path";



const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) =>{
    cb(null, path.join(__dirname, "images"));
  },
  filename: (_req, file, cb) =>{
    cb(null, new Date().toISOString() + "-" + file.originalname);
  }, 
  
});

const fileFilter = (_req: express.Request,
  file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if(file.mimetype == "image/png"){
    console.log(file);
    console.log("Received file mime tyoe");
    cb(null, true);
  }else{
    cb(null, false);
  }
};


const app = express();
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());
app.use(multer({storage: fileStorage, fileFilter}).single("file"));

app.use((req, res, next) =>{
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(auth);
app.use(nft);





console.log("started");
export default app.listen(7001);