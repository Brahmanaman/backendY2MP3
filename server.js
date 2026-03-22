require("dotenv").config()

const express = require("express")
const { exec } = require("child_process")
const path = require("path")
const fs = require("fs")
const cors = require("cors")

const app = express()
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json())

exec("yt-dlp --version", (err, stdout) => {
    console.log("yt-dlp version:", stdout)
})

const isDev = process.env.NODE_ENV !== "production"
console.log(isDev)
const ffmpeg = isDev ? `--ffmpeg-location "C:\\ffmpeg-8.1-essentials_build\\bin"` : ""

const FORMATS = {
    mp3: {
        ext: "mp3",
        command: (file, url) => `yt-dlp ${ffmpeg} -x --audio-format mp3 -o "${file}" ${url}`
    },
    m4a: {
        ext: "m4a",
        command: (file, url) => `yt-dlp ${ffmpeg} -x --audio-format m4a -o "${file}" ${url}`
    },
    wav: {
        ext: "wav",
        command: (file, url) => `yt-dlp ${ffmpeg} -x --audio-format wav -o "${file}" ${url}`
    },
    mp4: {
        ext: "mp4",
        command: (file, url) => `yt-dlp ${ffmpeg} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" --merge-output-format mp4 -o "${file}" ${url}`
    },
    mp4_720: {
        ext: "mp4",
        command: (file, url) => `yt-dlp ${ffmpeg} -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]" --merge-output-format mp4 -o "${file}" ${url}`
    },
    mp4_480: {
        ext: "mp4",
        command: (file, url) => `yt-dlp ${ffmpeg} -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]" --merge-output-format mp4 -o "${file}" ${url}`
    },
    webm: {
        ext: "webm",
        command: (file, url) => `yt-dlp ${ffmpeg} -f "bestvideo[ext=webm]+bestaudio/best" --merge-output-format webm -o "${file}" ${url}`
    }
}

app.get("/formats", (req, res) => {
    res.json([
        { id: "mp3", label: "MP3 - Audio", type: "audio" },
        { id: "m4a", label: "M4A - Audio", type: "audio" },
        { id: "wav", label: "WAV - Audio", type: "audio" },
        { id: "mp4", label: "MP4 - Best Quality", type: "video" },
        { id: "mp4_720", label: "MP4 - 720p", type: "video" },
        { id: "mp4_480", label: "MP4 - 480p", type: "video" },
        { id: "webm", label: "WebM - Video", type: "video" },
    ])
})

app.post("/download", (req, res) => {
    console.log(req.body)
    const { url, format = "mp3" } = req.body

    if (!url) return res.status(400).send("URL required")

    const selectedFormat = FORMATS[format]
    if (!selectedFormat) return res.status(400).send("Invalid format")

    const file = `media-${Date.now()}.${selectedFormat.ext}`
    const command = selectedFormat.command(file, url)

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log("Download error:", stderr)
            return res.status(500).send("Download failed")
        }

        const filepath = path.join(__dirname, file)
        res.download(filepath, () => {
            fs.unlink(filepath, () => { })
        })
    })
})

app.post("/info", (req, res) => {
    const { url } = req.body

    if (!url) return res.status(400).send("URL required")

    exec(`yt-dlp --dump-json ${url}`, (error, stdout, stderr) => {
        if (error) {
            console.log("yt-dlp error:", stderr)
            return res.status(500).json({ error: stderr })
        }

        try {
            const data = JSON.parse(stdout)
            res.json({
                title: data.title,
                thumbnail: data.thumbnail,
                duration: data.duration_string,
                channel: data.channel,
            })
        } catch (err) {
            console.log("JSON parse error:", err)
            res.status(500).json({ error: "Invalid yt-dlp output" })
        }
    })
})

app.get("/", (req, res) => {
    res.send("Server running")
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
