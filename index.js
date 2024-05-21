const express = require("express");
const multer = require("multer");
const csv = require("csvtojson");
const fs = require("fs");
const path = require("path");

const fetch = require("node-fetch");

const app = express();
const port = 8080;

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const jsonObj = await csv().fromFile(req.file.path);

    const formattedData = formatter(jsonObj);

    const responseData = [
      {
        name: "offlineGrowthRating",
        data: formattedData.reduce((acc, emp) => {
          acc[emp.employeeId.toString()] = emp;
          return acc;
        }, {}),
      },
    ];

    fs.writeFileSync(
      "GrowthRatingBypass.json",
      JSON.stringify(responseData),
      "utf-8",
    );

    res.download("GrowthRatingBypass.json", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).json({ error: "Error downloading JSON file" });
      }
      if (fs.existsSync("GrowthRatingBypass.json")) {
        fs.unlinkSync("GrowthRatingBypass.json");
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error" });
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
});

const formatter = (data) => {
  return data.map((d) => ({
    ...d,
    employeeId: +d.employeeId,
    year: +d.year,
    rating: +d.rating,
    businessUnit:
      d?.businessUnit === ""
        ? []
        : d?.businessUnit?.split(",")?.map((d) => d?.trim()),
    active: d?.active.toLowerCase() === "true",
    competencyChange: d?.competencyChange.toLowerCase() === "true",
    recommendedForPromotion: d?.recommendedForPromotion.toLowerCase() === "true",
    competency: d?.competency === "null" ? null : d?.competency,
  }));
}

const pingServer = () => {
  fetch("https://csvtojsonforcompapp.onrender.com/") // Replace with your actual deployment URL
    .then((response) => response.text())
    .catch((err) => console.error("Error pinging server:", err));
}

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  setInterval(pingServer, 120000);
});
