import { Mogu } from "@scobru/mogu";
import fse from "fs-extra";

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
      );

      let cid;
      const cidFilePath = process.cwd() + "/pages/api/cids.json";

      if (fse.existsSync(cidFilePath)) {
        const rawData = fse.readFileSync(cidFilePath, "utf8");
        cid = JSON.parse(rawData);
      } else {
        throw new Error("CID file not found.");
      }

      // Ensure that the state is fully loaded before proceeding
      const state = await mogu.load(cid);
      // create an array from state
      const stateArray = Array.from(state.values());
      console.log("State Values");

      if (state) {
        // Wait until the state is fully loaded before sending the response
        res.status(200).json({ data: stateArray });
      } else {
        res.status(404).json({ message: "No data found for this CID" });
      }
    } catch (error) {
      console.error("Handler error:", error);
      res.status(500).json({ error: error });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
