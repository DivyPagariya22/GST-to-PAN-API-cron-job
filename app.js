import express from "express";
import cron from "node-cron";
import dotenv from "dotenv";
import { findGSTFromPan } from "./utils/checkGSTFromPan.js";
dotenv.config();

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// cron.schedule(
//   "55 23 * * *",
//   async () => {
//     await findGSTFromPan();
//   },
//   {
//     scheduled: true,
//     timezone: "Asia/Kolkata",
//   }
// );

app.listen(port, async () => {
  await findGSTFromPan();
  console.log(`App listening at http://localhost:${port}`);
});
