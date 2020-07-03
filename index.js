"use strict";

const fastify = require("fastify")({
  logger: true,
});

function handle(conn) {
  conn.pipe(conn); // creates an echo server
}

fastify.register(require("fastify-websocket"), {
  handle,
  options: { maxPayload: 1048576 },
});

fastify.get("/", async (request, reply) => {
  return { hello: "world" };
});

fastify.get("/ws", { websocket: true }, (connection, req) => {
  connection.socket.on("message", (message) => {
    // message === 'hi from client'
    connection.socket.send("hi from server");
  });
});

fastify.listen(process.env.PORT || 3000, "0.0.0.0", (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  fastify.log.info("server is running...");
});
