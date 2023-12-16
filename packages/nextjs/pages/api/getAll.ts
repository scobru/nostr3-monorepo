import { Mogu } from "@scobru/mogu";
import { createClient } from "@vercel/kv";

const kv = createClient({
  url: String(process.env.KV_REST_API_URL),
  token: String(process.env.KV_REST_API_TOKEN),
});

export default async function handler(
  req: {
    method: string;
  },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: { (arg0: object): void; new (): any };
      end: { (): void; new (): any };
    };
  },
) {
  if (req.method === "GET") {
    try {
      const mogu = new Mogu(
        process.env.NEXT_PUBLIC_APP_KEY,
        process.env.NEXT_PUBLIC_PINATA_API_KEY,
        process.env.NEXT_PUBLIC_PINATA_API_SECRET,
        process.env.NEXT_PUBLIC_DB_NAME,
        process.env.NEXT_PUBLIC_PINATA_GATEWAY,
      );

      const cid = await kv.get("nostr3_cid");
      console.log("KV Object:", cid);

      if (cid) {
        // Ensure that the state is fully loaded before proceeding
        const state = await mogu.load(String(cid));
        // create an array from state
        const stateArray = Array.from(state.values());

        if (state) {
          // Wait until the state is fully loaded before sending the response
          res.status(200).json({ data: stateArray });
        } else {
          res.status(404).json({ message: "No data found for this CID" });
        }
      } else {
        console.log("No Cid");
      }
    } catch (error) {
      console.error("Handler error:", error);
      res.status(500).json({ error: error });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
