const { Mogu, EncryptedNode } = require("@scobru/mogu");
const dotenv = require("dotenv");
const { matchFilters } = require("nostr-tools");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const path = require("path");

const eventsFilePath = path.join(__dirname, "events.json");

dotenv.config();

const pid = Math.random().toString().slice(2, 8);
const wss = new WebSocketServer({ port: process.env.PORT });
const mogu = new Mogu(
  process.env.NEXT_PUBLIC_APP_KEY,
  process.env.NEXT_PUBLIC_PINATA_API_KEY,
  process.env.NEXT_PUBLIC_PINATA_API_SECRET,
  process.env.NEXT_PUBLIC_DB_NAME,
);

console.log("Running on port", process.env.PORT);

// Check if cids.json exist
let subs = new Map();
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

wss.on("connection", socket => {
  connCount += 1;

  console.log("Received connection", { pid, connCount });
  const relay = new Instance(socket);

  if (process.env.PURGE_INTERVAL) {
    const now = Date.now();
    relay.send([
      "NOTICE",
      "",
      "Next purge in " + Math.round((process.env.PURGE_INTERVAL * 1000 - (now - lastPurge)) / 1000) + " seconds",
    ]);
  }

  socket.on("message", msg => relay.handle(msg));
  socket.on("error", e => console.error("Received error on client socket", e));
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
    this.removeSub(subId);
  }
  onREQ(subId, ...filters) {
    console.log("REQ", subId, ...filters);
    this.addSub(subId, filters);

    const allEvents = readEventsFromFile();
    allEvents.forEach(event => {
      if (matchFilters(filters, event)) {
        this.send(["EVENT", subId, event]);
      }
    });

    console.log("EOSE");
    this.send(["EOSE", subId]);
  }
  onEVENT(event) {
    writeEventToFile(event);
    console.log("EVENT", event, true);
    this.send(["OK", event.id, true]);

    // Notifica a tutti i subscribers
    for (const [subId, { instance, filters }] of subs.entries()) {
      if (matchFilters(filters, event)) {
        console.log("match", subId, event);
        instance.send(["EVENT", subId, event]);
      }
    }
  }
}

function readEventsFromFile() {
  if (!fs.existsSync(eventsFilePath)) {
    // Se il file non esiste, crealo con un array vuoto
    fs.writeFileSync(eventsFilePath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const data = fs.readFileSync(eventsFilePath, "utf8");
    const events = JSON.parse(data);

    // Se il file è vuoto o non è un array, inizializzalo con un array vuoto
    if (!Array.isArray(events)) {
      return [];
    }

    return events;
  } catch (e) {
    console.error("Error reading events file:", e);
    // In caso di errore di lettura o parsing, ritorna un array vuoto
    return [];
  }
}

function writeEventToFile(event) {
  try {
    const events = readEventsFromFile();

    if (!Array.isArray(events)) {
      console.error("Invalid events format in file");
      return;
    }

    events.push(event);
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));

    // fetch events.json
    const storedJson = fs.readFileSync(eventsFilePath, "utf8");
    const storedEvents = JSON.parse(storedJson);

    const node: EncryptedNode = {
      id: String(wallet),
      type: "FILE",
      name: wallet,
      parent: "",
      children: [],
      content: JSON.stringify({ salt, iv, ciphertext }),
      encrypted: true,
    };
  } catch (e) {
    console.error("Error writing event to file:", e);
  }
}
