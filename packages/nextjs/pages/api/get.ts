import { Mogu } from "@scobru/mogu";
import fse from "fs-extra";

interface IResponse {
  error?: string;
  message?: string;
  data?: any;
}

export default async function handler(
  req: {
    method: string;
    query: { pubkey: string };
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
  // GET Section
  if (req.method === "GET") {
    const mogu = new Mogu(
      process.env.NEXT_PUBLIC_APP_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_KEY,
      process.env.NEXT_PUBLIC_PINATA_API_SECRET,
      process.env.NEXT_PUBLIC_DB_NAME,
    );

    const { pubkey } = req.query;

    let cid;
    let state;

    if (fse.existsSync(process.cwd() + "/pages/api/cids.json")) {
      const rawData = fse.readFileSync(process.cwd() + "/pages/api/cids.json", "utf8");
      cid = JSON.parse(rawData);
    }

    console.log("IPFS hash", cid);

    try {
      state = await mogu.load(cid);
      console.log("State;", state);
      const content = JSON.stringify({ pubKey: pubkey });
      state = mogu.queryByContent(content);
      console.log(pubkey);
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
