const { Mogu, EncryptedNode } = require("@scobru/mogu");
const dotenv = require("dotenv");
const { matchFilters } = require("nostr-tools");
const { WebSocketServer } = require("ws");
const fs = require("fs");

dotenv.config();

const pid = Math.random().toString().slice(2, 8);
const wss = new WebSocketServer({ port: process.env.PORT });
const mogu = new Mogu(
  process.env.APP_KEY,
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET,
  process.env.DB_NAME
);

console.log("Running on port", process.env.PORT);

// Check if cids.json exist
let cid = null;
let subs;

// Check if cids.json exist
subs = new Map();

let connCount = 0;
let events = [];

let lastPurge = Date.now();

if (process.env.PURGE_INTERVAL) {
  console.log("Purging events every", process.env.PURGE_INTERVAL, "seconds");
  setInterval(() => {
    lastPurge = Date.now();
    events = [];
  }, process.env.PURGE_INTERVAL * 1000);
}

wss.on("connection", (socket) => {
  connCount += 1;

  console.log("Received connection", { pid, connCount });

  if (fs.existsSync("cids.json")) {
    // Read cids.json
    cid = JSON.parse(fs.readFileSync("cids.json"));
    // Load mogu from cid
    let state;
    console.log(cid);

    const run = async () => {
      const _state = await mogu.load(String(cid));
      const json = JSON.stringify(_state);
      return json;
    };

    run()
      .then((state) => {
        console.log("State", JSON.stringify(state));
        // Qui puoi continuare a lavorare con 'state' dopo che la promessa è stata risolta
        // create a Set() from state
        subs = new Map(Object.entries(JSON.parse(state).content));
        console.log("Subs", subs);
      })
      .catch((error) => {
        console.error("Errore durante l'esecuzione di run():", error);
      });

    console.log("State", state);

    // create a Set() from state
    subs = new Map(Object.entries(JSON.parse(state).content));
    console.log("Subs", subs);
  } else {
    // Create new subs
    console.log("Creating new subs");
    // Create new events
  }

  const relay = new Instance(socket);

  if (process.env.PURGE_INTERVAL) {
    const now = Date.now();
    relay.send([
      "NOTICE",
      "",
      "Next purge in " +
        Math.round(
          (process.env.PURGE_INTERVAL * 1000 - (now - lastPurge)) / 1000
        ) +
        " seconds",
    ]);
  }

  socket.on("message", (msg) => relay.handle(msg));
  socket.on("error", (e) =>
    console.error("Received error on client socket", e)
  );
  socket.on("close", () => {
    relay.cleanup();

    connCount -= 1;

    console.log("Closing connection", { pid, connCount });
  });
});

class Instance {
  constructor(socket) {
    this._socket = socket;
    this._subs = new Set();
  }
  cleanup() {
    this._socket.close();

    for (const subId of this._subs) {
      this.removeSub(subId);
    }
  }
  addSub(subId, filters) {
    subs.set(subId, { instance: this, filters });
    this._subs.add(subId);
  }
  removeSub(subId) {
    subs.delete(subId);
    this._subs.delete(subId);
  }
  send(message) {
    this._socket.send(JSON.stringify(message));
  }
  handle(message) {
    try {
      message = JSON.parse(message);
    } catch (e) {
      this.send(["NOTICE", "", "Unable to parse message"]);
    }

    let verb, payload;
    try {
      [verb, ...payload] = message;
    } catch (e) {
      this.send(["NOTICE", "", "Unable to read message"]);
    }

    const handler = this[`on${verb}`];

    if (handler) {
      handler.call(this, ...payload);
    } else {
      this.send(["NOTICE", "", "Unable to handle message"]);
    }
  }
  onCLOSE(subId) {
    //this.removeSub(subId);
    //mogu.removeNode(subId);
    const run = async () => {
      cid = await mogu.store();
    };
    run();
    // save cids on cids.json
    fs.writeFileSync("cids.json", JSON.stringify(cid));
  }
  onREQ(subId, ...filters) {
    console.log("REQ", subId, ...filters);

    this.addSub(subId, filters);

    // converts _subs into a json string
    const node = {
      id: String(events.length), // Set an appropriate ID
      type: "FILE",
      name: String(subId),
      parent: "",
      children: [],
      content: JSON.stringify(filters),
      encrypted: false, // Set to true if data is encrypted
    };

    mogu.addNode(node);
    console.log("Adding node:", node);

    for (const event of events) {
      if (matchFilters(filters, event)) {
        console.log("match", subId, event);

        this.send(["EVENT", subId, event]);
      } else {
        console.log("miss", subId, event);
      }
    }

    console.log("EOSE");

    this.send(["EOSE", subId]);
  }
  onEVENT(event) {
    events.push(event);

    console.log("EVENT", event, true);

    this.send(["OK", event.id, true]);

    for (const [subId, { instance, filters }] of subs.entries()) {
      if (matchFilters(filters, event)) {
        console.log("match", subId, event);

        instance.send(["EVENT", subId, event]);
      }
    }
  }
}
