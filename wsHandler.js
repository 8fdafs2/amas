import deviceDatabase from "./deviceDatabase.js";

console.log(deviceDatabase);

const wsHandler = (conn, req) => {
  console.log("connection established");

  // inspect token in request headers and validate the user
  const validated = true;

  if (!validated) {
    console.log("closing the connection ...");
    conn.end();
    return;
  }

  conn.socket.on("message", async (message) => {
    message = JSON.parse(message);

    console.log(`receiving ${JSON.stringify(message)}`);

    const type = message.type;
    const data = message.data;

    switch (type) {
      case "requestDeviceState":
        /*
        {
          "type": "requestDeviceState",
          "data": {
            "deviceId": "12-34-56-78-9a",
            "request": ["onlineState"],
          }
        }
        {
          "type": "requestDeviceState",
          "data": {
            "deviceId": "12-34-56-78-9a",
            "request": ["all"],
          }
        }
        */
        onRequestDeviceState(conn, data);
        break;
      case "requestCarState":
        /*
        {
          "type": "requestCarState",
          "data": {
            "deviceId": "12-34-56-78-9a",
            "request": ["lightState", "acState"],
          }
        }
        {
          "type": "requestCarState",
          "data": {
            "deviceId": "12-34-56-78-9a",
            "request": ["all"],
          }
        }
        */
        onRequestCarState(conn, data);
        break;
      case "changeCarState":
        /*
        {
          "type": "changeCarState",
          "data": {
            "deviceId": "12-34-56-78-9a",
            "change": {
                "windowState": 2,
                "engineState": 1,
            },
          }
        }
        */
        onChangeCarState(conn, data);
        break;
      case "keepAlive":
        /*
        {
          "type": "keepAlive",
          "data": "",
        }
        */
        _keepAlive();
        break;
      default:
        break;
    }
  });
};

function _keepAlive() {
  // do nothing
}

function onRequestDeviceState(conn, data) {
  const rec = findDeviceInfo(conn, data.deviceId);
  if (!rec) return;

  sendJSON(conn, {
    type: "deviceState",
    data: {
      deviceId: rec.deviceId,
      state: {
        onlineState: rec.onlineState,
      },
    },
  });
}

function onRequestCarState(conn, data) {
  const rec = findDeviceInfo(conn, data.deviceId);
  if (!rec) return;

  if (stopWhenDeviceOffline(conn, rec)) return;

  setTimeout(() => {
    const reply = {
      type: "carState",
      data: {
        deviceId: data.deviceId,
        state: {},
      },
    };

    if (data.request.includes("all")) {
      for (const [key, value] of Object.entries(rec.carState)) {
        reply.data.state[key] = value;
      }
    } else {
      for (const key in data.request) {
        reply.data.state[key] = rec.carState[key];
      }
    }

    sendJSON(conn, reply);
  }, 1000);
}

function onChangeCarState(conn, data) {
  const rec = findDeviceInfo(conn, data.deviceId);
  if (!rec) return;

  if (stopWhenDeviceOffline(conn, rec)) return;

  setTimeout(() => {
    for (const [key, value] of Object.entries(data.change)) {
      rec.carState[key] = value;
    }

    const reply = {
      type: "carState",
      data: {
        deviceId: data.deviceId,
        state: {},
      },
    };

    for (const key in data.change) {
      reply.data.state[key] = rec.carState[key];
    }

    sendJSON(conn, reply);
  }, 1000);
}

// -----------------------------------------------------------------------------

function sendJSON(conn, message) {
  console.log(`sending ${JSON.stringify(message)}`);
  conn.socket.send(JSON.stringify(message));
}

function findDeviceInfo(conn, deviceId) {
  const rec = deviceDatabase.find((rec) => rec.deviceId === deviceId);

  if (!rec) {
    conn.socket.send({
      type: "error",
      data: {
        request: "changeCarState",
        reason: "failed to find device info",
      },
    });
    return null;
  }

  return rec;
}

function stopWhenDeviceOffline(conn, rec) {
  if (rec.onlineState == 1) {
    sendJSON(conn, {
      type: "deviceState",
      data: {
        deviceId: rec.deviceId,
        state: {
          onlineState: rec.onlineState,
        },
      },
    });

    return true;
  }
  return false;
}

export default wsHandler;
