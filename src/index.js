import express from "express"
import { Server } from "socket.io"
import { createServer } from "http"
import cors from "cors"

// We can initialize a in-memory shared array that will be used in our socket handlers
// as well as in our express routes.
const port = process.env.PORT || 3030

let onlineUsers = []

// Initializing our express app
const app = express()

app.use(cors())
app.use(express.json())

const whiteListOrigins = [
  process.env.PROD_FE_URL,
  process.env.PROD_ADMINFE_URL,
  process.env.DEV_FE_URL,
  process.env.DEV_FE_ADMIN_DASHBOARD_URL,
]
app.use(
  cors({
    origin: function (origin, next) {
      if (!origin || whiteListOrigins.indexOf(origin) !== -1) next(null, true)
      else next(new Error("cors error"))
    },
  })
)

app.get("/online-users", (req, res) => {
  res.send({ onlineUsers })
})

// Handling some express routes/routers...
//....

// Creating a new HTTP server using the standard NodeJS http module
// passing our express app for the configuration of the routes*
const httpServer = createServer(app)

// * This is important because the Server from socket.io accepts in input only a standard HTTP server
const io = new Server(httpServer, {
  /* options */
})

io.on("connection", (socket) => {
  // ...
  console.log(socket.id)

  socket.emit("welcome", { message: "Welcome!" })

  socket.on("setUsername", ({ username, room, svg }) => {
    console.log({ username: username, room: room })

    onlineUsers.push({ username, id: socket.id, room, svg })

    // Now we have the socket join a specific "room"
    socket.join(room)

    console.log(socket.rooms)

    // Emits to the other end of the channel
    socket.emit("loggedin")

    // Emits to the other end of *every other* channel
    socket.broadcast.emit("newConnection")

    // Emits to every connected socket
    // io.sockets.emit()
  })

  socket.on("sendmessage", ({ message, room }) => {
    console.log(message)

    // Emits only to people inside of the defined "room"
    socket.to(room).emit("message", message)
  })

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((user) => user.id !== socket.id)
    socket.broadcast.emit("disconnectedUser")
  })
})

// CAUTION: we do not app.listen()
// but rather httpServer.listen()
httpServer.listen(port, () => {
  console.log("Server is listening on port", port)
})
