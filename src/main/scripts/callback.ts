// Electron
import { webContents } from 'electron'

// Required modules
const http = require('http')
const url = require('url')

// Website URL
const WEBSITE = import.meta.env.VITE_WEBSITE

export default (): string => {
  const webContent = webContents.getFocusedWebContents()
  // Maintain a hash of all connected sockets
  // eslint-disable-next-line prefer-const
  let sockets = {},
    nextSocketId = 0

  // Create a new server avaible port
  const server = http
    .createServer(async function (req, res) {
      // Parse the URL to get the query parameters
      const parsedUrl = url.parse(req.url, true)
      const query = parsedUrl.query

      // Extract 'code' and 'error' query parameters
      const code = query.code || undefined
      const error = query.error || undefined

      if (code && webContent) {
        res.writeHead(301, {
          Location: WEBSITE + '/Session/Successful'
        })
        res.end() // End the response

        // Send the code to the preload/render process
        webContent.send('callback:exchange', code)
      } else {
        // Manage Error
        let error_code
        let error_description

        if (error) {
          // Send to analytics
          error_code = query.error_code
          error_description = query.error_description
        } else {
          error_code = '424'
          error_description = 'Failed Dependency'
        }

        res.writeHead(301, {
          Location:
            WEBSITE + '/Error?error_code=' + error_code + '&error_description=' + error_description
        })
        res.end() // End the response
      }

      // Close the server
      server.close(function () {
        console.log('Server closed!')
      })
      // Destroy all open sockets
      for (const socketId in sockets) {
        sockets[socketId].destroy()
      }
    })
    .listen(0)

  // Store the sockets in the 'sockets' hash, so they can be destroyed later
  server.on('connection', function (socket) {
    // Add a newly connected socket
    const socketId = nextSocketId++
    sockets[socketId] = socket
    console.log('socket', socketId, 'opened')

    // Remove the socket when it closes
    socket.on('close', function () {
      console.log('socket', socketId, 'closed')
      delete sockets[socketId]
    })
  })

  // Close the server after 10 minutes
  setTimeout(
    () => {
      // Close the server
      server.close(function () {
        console.log('Server closed!')
      })
      // Destroy all open sockets
      for (const socketId in sockets) {
        console.log('socket', socketId, 'destroyed')
        sockets[socketId].destroy()
      }
    },
    10 * 60 * 1000
  ) // 10 minutes

  // Retrieve the assigned port number
  const port = server.address().port
  const callback = `http://localhost:${port}`
  // Return callback url
  return callback
}
