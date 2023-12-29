import { Request, Response } from "express";
import axios from "axios";
import {createAccount} from "../utils/endpoints";



export const signUp = async (req: Request, res: Response) => {
  const password = req.body.password;
  const username = req.body.username;
  const email = req.body.email;
  const phone = req.body.phone;
  const url = createAccount;  
  axios
    .post(url, {password, username, email, phone}, { headers: { "Content-Type": "multipart/form-data" } })
    .then((response) => {
      res.status(201).json(response.data);
      res.end();
    })
    .catch((error) => {
      console.error(error);
      console.log(error.message);
    //    res.writeHead(400, { error: JSON.stringify(error) });
    const strE = JSON.stringify(error);
       res.write(JSON.stringify(error.message));  
       res.end();
    });

};
