import { serve } from '@hono/node-server'
import config from './shared/config/config'
import createApp from './app'
import { registerEventListeners } from './core/events/listeners'
import { initSocket, setupSocketAdapter } from './core/socket'

const startServer = async () => {
  const app = await createApp()

  const server = serve(
    { fetch: app.fetch, port: config.port },
    (info) => {
      console.log(`🚀 Server running at http://localhost:${info.port}`)
    }
  )

  const io = initSocket();
  io.attach(server);
  setupSocketAdapter();
  registerEventListeners();
}

await startServer()
