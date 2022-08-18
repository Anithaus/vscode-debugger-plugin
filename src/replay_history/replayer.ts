import http from "http"
import { Worker } from "@temporalio/worker"
import { temporal } from "@temporalio/proto"

export async function run(): Promise<void> {
  const pluginUrl = process.env.TEMPORAL_DEBUGGER_PLUGIN_URL
  const optionsPath = process.env.TEMPORAL_DEBUGGER_REPLAYER_OPTIONS_PATH
  if (!pluginUrl) {
    throw new Error("Missing TEMPORAL_DEBUGGER_PLUGIN_URL environment variable")
  }
  if (!optionsPath) {
    throw new Error("Missing TEMPORAL_DEBUGGER_REPLAYER_OPTIONS_PATH environment variable")
  }
  const req = http.get(`${pluginUrl}/history`)
  const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
    req.on("error", reject)
    req.on("response", resolve)
  })
  const chunks = Array<Buffer>()
  for await (const chunk of response) {
    chunks.push(chunk)
  }
  const contentLength = response.headers["content-length"]
  if (!contentLength) {
    throw new Error("Empty response body when getting history")
  }
  const body = Buffer.concat(chunks)
  const history = temporal.api.history.v1.History.decode(body, parseInt(contentLength))

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { options } = require(optionsPath)
  console.log(options)
  await Worker.runReplayHistory(options, history)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
