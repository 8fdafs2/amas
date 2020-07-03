"use strict";

import fastify from "fastify";
import fastifyWebsocket from "fastify-websocket";

import wsHandler from "./wsHandler.js";

const app = fastify();

function handle(conn) {
  conn.pipe(conn); // creates an echo server
}

app.register(fastifyWebsocket, {
  handle,
  options: { maxPayload: 1048576 },
});

app.get("/ws", { websocket: true }, wsHandler);

app.listen(process.env.PORT || 8137, "0.0.0.0", (err) => {
  if (err) {
    console.log.error(err);
    process.exit(1);
  }

  console.log("server is running...");
});
