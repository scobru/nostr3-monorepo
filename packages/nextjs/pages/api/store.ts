import { Mogu } from "@scobru/mogu";
import { EncryptedNode } from "@scobru/mogu/dist/db/db";
import { createClient } from "@vercel/kv";

const kv = createClient({
  url: String(process.env.KV_REST_API_URL),
  token: String(process.env.KV_REST_API_TOKEN),
});

interface IResponse {
  error?: string;
  message?: string;
  data?: any;
}

const mogu = new Mogu(
  process.env.NEXT_PUBLIC_APP_KEY,
  process.env.NEXT_PUBLIC_PINATA_API_KEY,
  process.env.NEXT_PUBLIC_PINATA_API_SECRET,
  process.env.NEXT_PUBLIC_DB_NAME,
  process.env.NEXT_PUBLIC_PINATA_GATEWAY,
);

export default async function handler(
  req: {
    method: string;
    body: { evmAddress: string; pubKey: string };
    query: { evmAddress: string };
  },
  res: {
    status: (arg0: any) => {
      (): any;
      new (): any;
      json: { (arg0: IResponse): void; new (): any }; // Usa IResponse qui
      end: { (): void; new (): any };
    };
  },
) {
  const cid = await kv.get("nostr3_cid");
  console.log("KV Object:", cid);
  let state;

  const { evmAddress, pubKey } = req.body;

  const node: EncryptedNode = {
    id: String(evmAddress),
    type: "FILE",
    name: String(evmAddress),
    parent: "",
    children: [],
    content: JSON.stringify({ pubKey }),
    encrypted: true,
  };

  if (req.method === "POST") {
    // Cid not exists
    if (!cid) {
      console.log("CID not exists!");
      try {
        state = mogu.addNode(node);
      } catch (error) {
        console.log(error);
      }

      const hash = await mogu.store();
      console.log("CID:", hash);
      await kv.set("nostr3_cid", JSON.stringify(hash));

      return res.status(200).json({
        message: "Key stored and pinned to IPFS via Pinata successfully",
        data: hash,
      });
    } else {
      console.log("CID exists!");
      state = await mogu.load(String(cid));

      console.log("Old CID", cid);
      console.log("State:", state);

      const storedState = mogu.queryByName(evmAddress);
      console.log("StoredState:", storedState);

      if (JSON.parse(JSON.stringify(storedState)).length != 0) {
        try {
          state = await mogu.load(String(cid));
          state = mogu.updateNode(node);
          console.log(state);

          await mogu.unpin(String(cid));
          const hash = await mogu.store();
          console.log("New CID", hash);

          await kv.set("nostr3_cid", JSON.stringify(hash));

          return res.status(200).json({
            message: "Key stored and pinned to IPFS via Pinata successfully",
            data: hash,
          });
        } catch (error) {
          console.log(error);
        }
      } else {
        try {
          state = await mogu.load(String(cid));
          state = mogu.addNode(node);
          console.log(state);

          const hash = await mogu.store();
          console.log("New CID", hash);

          await kv.set("nostr3_cid", JSON.stringify(hash));

          return res.status(200).json({
            message: "Key stored and pinned to IPFS via Pinata successfully",
            data: hash,
          });
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  // GET Section
  if (req.method === "GET") {
    const mogu = new Mogu(
      process.env.NEXT_PUBLIC_APP_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_SECRET,
      process.env.NEXT_PUBLIC_DB_NAME,
      process.env.NEXT_PUBLIC_PINATA_GATEWAY,
    );

    const { evmAddress } = req.query;

    console.log("IPFS hash", cid);

    try {
      state = await mogu.load(String(cid));
      console.log("State;", state);
      state = mogu.queryByName(evmAddress);
      console.log(evmAddress);
      console.log("Query:", state);
    } catch (error) {
      console.log(error);
    }

    state = JSON.stringify(state);
    console.log(state);

    if (state) {
      res.status(200).json({ data: state });
    } else {
      res.status(404).json({ message: "No private key found for this contract address" });
    }
  }
}
