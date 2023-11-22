const { Mogu, EncryptedNode } = require("@scobru/mogu");
const dotenv = require("dotenv");
const { matchFilters } = require("nostr-tools");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const path = require("path");

const eventsFilePath = path.join(__dirname, "events.json");
const cidsFilePath = path.join(__dirname, "cids.json");

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

const runRecreateFromCID = async () => {
  await recreateEventsFromCID();
};
runRecreateFromCID();

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
    // Assicurati di attendere che l'evento sia completamente elaborato
    writeEventToFile(event)
      .then(() => {
        console.log("EVENT", event, true);
        this.send(["OK", event.id, true]);

        // Notifica a tutti i subscribers
        for (const [subId, { instance, filters }] of subs.entries()) {
          if (matchFilters(filters, event)) {
            console.log("match", subId, event);
            instance.send(["EVENT", subId, event]);
          }
        }
      })
      .catch(e => console.error("Error processing event:", e));
  }
}

function readEventsFromFile() {
  // if (!fs.existsSync(eventsFilePath)) {
  //   // Se il file non esiste, crealo con un array vuoto
  //   fs.writeFileSync(eventsFilePath, JSON.stringify([], null, 2));
  //   return [];
  // }
  const data = fs.readFileSync(eventsFilePath, "utf8");
  events = JSON.parse(data);
  return events;
}

async function writeEventToFile(event) {
  try {
    let events = readEventsFromFile();

    if (event.kind == 0) {
      // Assumendo che il tipo dell'evento sia memorizzato in `event.type`
      const index = events.findIndex(e => e.kind === event.kind); // Trova l'indice dell'evento esistente
      if (index !== -1) {
        events[index] = event; // Sostituisci l'evento esistente
      } else {
        events.push(event); // Aggiungi il nuovo evento se non esiste
      }
    } else {
      events.push(event); // Per gli eventi non di tipo 0, semplicemente aggiungi all'array
    }

    // Aggiorna il file events.json
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));

    // Crea il nodo da memorizzare su IPFS
    const node = {
      id: "0",
      type: "FILE",
      name: String(event.id),
      parent: "",
      children: [],
      content: JSON.stringify(events, null, 2),
      encrypted: false,
    };

    // Memorizza il nodo su IPFS
    mogu.addNode(node);
    const cid = await mogu.store();
    console.log("CID:", cid);

    // Aggiorna cids.json solo dopo che il contenuto è stato memorizzato
    fs.writeFileSync(cidsFilePath, cid);
  } catch (e) {
    console.error("Error writing event to file:", e);
  }
}

async function recreateEventsFromCID() {
  if (fs.existsSync(eventsFilePath)) {
    // Se events.json esiste già, non è necessario ricrearlo
    return;
  }

  let cid;

  if (!fs.existsSync(cidsFilePath)) {
    // Se events.json esiste già, non è necessario ricrearlo
    return;
  }

  try {
    // Leggi il CID da cids.json
    const cidData = fs.readFileSync(cidsFilePath, "utf8");
    cid = cidData;
  } catch (e) {
    console.error("Error reading cids.json:", e);
    return;
  }

  try {
    // Carica il contenuto corrispondente al CID tramite Mogu
    const contentMap = await mogu.load(cid);

    if (!contentMap) {
      throw new Error("No content found for the given CID");
    }

    // Estrai il campo content dal primo elemento della mappa
    const contentString = contentMap.get("0").content;

    // Converte la stringa JSON in un oggetto JavaScript
    const content = JSON.parse(contentString);

    console.log(content);

    // Scrivi il contenuto nel file events.json
    fs.writeFileSync(eventsFilePath, JSON.stringify(content, null, 2));
  } catch (e) {
    console.error("Error recreating events file from CID:", e);
  }
}
