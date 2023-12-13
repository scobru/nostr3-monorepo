import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 w-full sm:w-4/5 md:w-3/4 lg:w-3/6 mx-auto ">
      <MetaHeader />
      <div className="w-full">
        {/* <Image className="mb-5 mx-auto" src="/assets/nostr3.png" width={400} height={400} alt="nostr3" /> */}
        <div className="m-5 mx-auto w-5/6">
          <h1 className="text-4xl text-center mb-5">
            Welcome to <strong>Nostr3</strong> : Enhancing the Nostr Protocol with Web3 Interoperability
          </h1>
          <p className="text-xl mb-4 text-center">
            Effortlessly generate Nostr keys with your EVM address and engage in seamless tipping transactions.
          </p>
          <div className="my-10" />
          <h2 className="text-3xl text-left mb-3 font-semibold ">Core Features</h2>
          <ul className="list-disc list-inside mb-5 text-md">
            <li>Signature Signing & Keypair Generation</li>
            <li>Database Registration of EVM Addresses</li>
            <li>Quick and Efficient Tipping through URL Links</li>
            <li>Enabling Interoperability and Easy Transactions</li>
          </ul>
          <div className="my-10" />
          <h2 className="text-3xl text-left mb-3 font-bold">How to Send a Tip</h2>
          <ul className="list-disc list-inside mb-5">
            <li>
              <strong>Visit the Tipping URL:</strong> Navigate to the URL provided by the content creator or user. For
              example,{" "}
              <a href="https://nostr3.vercel.app/tip/npub1abcd1234/note12345abcd" className="text-blue-600 break-all">
                nostr3.vercel.app/tip/npub1abcd1234/note12345abcd
              </a>
              .
            </li>
            <li>
              <strong>Connect Your Wallet:</strong> On the tipping page, connect your Web3 wallet.
            </li>
            <li>
              <strong>Enter Tip Amount:</strong> Choose the amount you wish to tip.
            </li>
            <li>
              <strong>Confirm the Transaction:</strong> Approve the transaction to send your tip directly to the
              recipient’s EVM address.
            </li>
            <li>
              <strong>Recipient Without Linked Address:</strong> If the recipient’s public key is not linked to an EVM
              address, you can send them a private message with a unique password.
            </li>
            <li>
              <strong>Recipient Claims Tip:</strong> The recipient can later claim the tip from the smart contract by
              entering this password.
            </li>
          </ul>
          <div className="my-10" />

          <h2 className="text-3xl text-left mb-3 font-bold">How to Claim a Tip</h2>
          <ul className="list-disc list-inside mb-5">
            <li>
              <strong>Link EVM Address:</strong> Ensure your Nostr public key is linked to an EVM address. Tips are
              directly sent to the linked wallet.
            </li>
            <li>
              <strong>No Linked Address:</strong> If your public key isn’t linked to an EVM address, the tip sender will
              send you a private message containing a unique key.
            </li>
            <li>
              <strong>Access Claim Page:</strong> Visit{" "}
              <a href="https://nostr3.vercel.app/claim" className="text-blue-600">
                nostr3.vercel.app/claim
              </a>{" "}
              and connect your Web3 wallet.
            </li>
            <li>
              <strong>Enter the Unique Key:</strong> If you received a private message, input the provided key in the
              designated field.
            </li>
            <li>
              <strong>Confirm the Transaction:</strong> Approve the transaction in your wallet to receive the tip.
            </li>
          </ul>

          <p className="text-center my-4">
            Learn more about NIP-111:{" "}
            <a href="https://github.com/nostr-protocol/nips/pull/268" className="text-blue-600">
              NIP-111 on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
