const express = require("express")
const { exec } = require("child_process")
const path = require("path")
const fs = require("fs")
const cors = require("cors")

const app = express()

const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

exec("yt-dlp --version", (err, stdout) => {
    console.log("yt-dlp version:", stdout);
});

app.post("/download", (req, res) => {

    const url = req.body.url

    if (!url) {
        return res.status(400).send("URL required")
    }

    const file = `audio-${Date.now()}.mp3`

    //for local window 
    // const command = `yt-dlp --js-runtimes node --ffmpeg-location "C:\\ffmpeg-8.1-essentials_build\\bin" -x --audio-format mp3 -o "${file}" ${url}`

    //for production on railway
    const command = `yt-dlp -x --audio-format mp3 -o "${file}" ${url}`

    exec(command, (error) => {

        if (error) {
            console.log(error)
            return res.status(500).send("Download failed")
        }

        const filepath = path.join(__dirname, file)
        res.download(filepath, () => {
            fs.unlink(filepath, () => { })
        })

    })

})

app.get("/", (req, res) => {
    res.send("Server running")
})

app.post("/info", (req, res) => {

    const url = req.body.url

    if (!url) {
        return res.status(400).send("URL required")
    }

    const command = `yt-dlp --dump-json ${url}`

    exec(command, (error, stdout, stderr) => {

        if (error) {
            console.log("yt-dlp error:", stderr)
            return res.status(500).json({ error: stderr })
        }

        try {

            const data = JSON.parse(stdout)

            res.json({
                title: data.title,
                thumbnail: data.thumbnail
            })

        } catch (err) {

            console.log("JSON parse error:", err)
            res.status(500).json({ error: "Invalid yt-dlp output" })

        }
    })

})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})