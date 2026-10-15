const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const mongoose = require("mongoose")
const questionRoutes = require("./route/question_route")
const codingRoutes = require("./route/coding_route.js")

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_interview_app_database")
    .then(function() {
        console.log("server connected with mongodb instance")
    }).catch(function(error) {
        console.log("mongodb couldn't connect with server", error)
    })

app.use("/api/auth", require("./route/auth_routes"))
app.use("/api/question", questionRoutes)
app.use("/api/interviews", require("./route/interview"))
app.use("/api/results", require("./route/result"))
app.use("/api/roles", require("./route/role"))
app.use("/api/coding", codingRoutes)
app.use("/api/adaptive", require("./route/adaptive_routes"))

// landing page
app.get("/", function(req, res) {
    res.send("AI Interview Platform API - Running")
})


const PORT = process.env.PORT || 5000
app.listen(PORT, function() {
    console.log(`SERVER IS LIVE AND RUNNING ON PORT ${PORT}`)
})
