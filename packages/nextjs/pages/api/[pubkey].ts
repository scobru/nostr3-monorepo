import { Mogu } from "@scobru/mogu";
import { createClient } from "@vercel/kv";
import { nip19 } from "nostr-tools";

const kv = createClient({
  url: String(process.env.KV_REST_API_URL),
  token: String(process.env.KV_REST_API_TOKEN),
});

export default async function handler(
  req: {
    method: string;
    query: { pubkey: string };
  },
  res: {
    status: (arg0: any) => {
      (): any;
      new (): any;
      json: { (arg0: object): void; new (): any };
      end: { (): void; new (): any };
    };
  },
) {
  // GET Section
  if (req.method === "GET") {
    const mogu = new Mogu(
      process.env.NEXT_PUBLIC_APP_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_SECRET,
      process.env.NEXT_PUBLIC_DB_NAME,
      process.env.NEXT_PUBLIC_PINATA_GATEWAY,
    );

    const pubkey = req.query.pubkey;

    const cid = await kv.get("nostr3_cid");
        console.log("KV Object", cid);

        
    let state;
    if (cid) {
      let formattedPubKey = "";

      if (pubkey.startsWith("npub")) {
        const decoded = nip19.decode(pubkey);
        formattedPubKey = decoded.data as string;
      } else {
        formattedPubKey = pubkey;
      }

      try {
        state = await mogu.load(String(cid));
        console.log("State;", state);
        const content = JSON.stringify({ pubKey: formattedPubKey });
        state = mogu.queryByContent(content);
        console.log("Query:", state);
      } catch (error) {
        console.log(error);
      }

      state = JSON.parse(JSON.stringify(state));
      console.log(state);

      const evmAddress = state[0].id;
      const pubKey = JSON.parse(state[0].content).pubKey;

      if (state) {
        res.status(200).json({ evmAddress, pubKey });
      } else {
        res.status(404).json({ message: "No private key found for this contract address" });
      }
    } else {
      res.status(404).json({ message: "No CID" });
    }
  }
}
