import express from "express";
import cors from "cors";
import { exec } from "child_process";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/run", (req, res) => {
  const input = req.body.input;

  fs.writeFileSync("input.txt", input);

  exec("./lab4 < input.txt", (err, stdout, stderr) => {
    if (err) return res.status(500).send(stderr);
    res.json({ output: stdout });
  });
});

app.listen(3001, () => {
  console.log("Backend running on port 3001");
});
