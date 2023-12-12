import Image from "next/image";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import 'daisyui/dist/full.css'; // Importa lo stile completo di DaisyUI

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 w-full sm:w-4/5 md:w-3/4 lg:w-3/6 mx-auto">
      <MetaHeader />
      <div className="w-full">
        <Image className="mb-5 mx-auto" src="/assets/nostr3.png" width={400} height={400} alt="nostr3" />
        <div className="m-5 mx-auto w-5/6">
          <h1 className="text-4xl w-2/4 justify-center items-centert text-center mb-5 mx-auto">Generate Keys for <strong> NOSTR </strong> Protocol with Your <strong>EVM</strong> Address</h1>
          {/* <p className="text-xl">
            <strong>Nostr3</strong> is here to make your life easier when dealing with the Nostr protocol! It cleverly generates private keys
            right from your EVM address, taking the hassle out of key storage. Need your keys? Just a quick interaction
            with Nostr3, and you are all set. What&apos;s more, it links your Nostr accounts to your EVM accounts,
            making tipping a breeze for all Nostr accounts set up through Nostr3. For the best Nostr experience, we
            suggest pairing it with open-source clients. Happy Nostring!
          </p>

          <div className="bg-success text-success-content rounded-md my-8 p-6">
            <h2 className="text-2xl mb-4">🎉 Updates</h2>
            <ul className="list-disc space-y-2">
              <li className="text-lg font-medium">
                <span className="font-bold">Nostr3 Tipping URL Routing</span>: Facilitate direct tipping to authors on a blog platform via Nostr3 tipping URLs. Each blog post can feature a unique link, allowing readers to tip the author seamlessly. For instance, a URL like `https://nostr3.vercel.app/tip/npub1abcd1234/note12345abcd` directly routes a tip to the author's public key (`npub1abcd1234`) and associates it with a specific note or content item (`note12345abcd`). This feature simplifies the process of showing appreciation, making it more interactive and user-friendly.
              </li>
              <li className="text-lg font-medium">
                <span className="font-bold">Secret Tip Feature</span>: This function allows users to send tips anonymously and securely. A random key is generated for each tip, which is then encrypted. The receiver gets a private message with this key to claim their tip. The tip is stored in a smart contract, ensuring safety and privacy. Users can opt for this feature whether they are using the extension or not, facilitating both convenience and security in transactions.
              </li>
              <li className="text-lg font-medium">
                <span className="font-bold">NIP-111</span>: Implementation of NIP-111, which allows for the association
                of an EVM address with a Nostr3 public key. This allows for the easy transfer of tips between EVM and
                Nostr3 accounts.
              </li>
              <li className="text-lg font-medium">
                <span className="font-bold">Nos2x Extension Compatibility</span>: Log in seamlessly using the nos2x
                extension for a smoother experience.
              </li>
              <li className="text-lg font-medium">
                <span className="font-bold">List Address Box Feature</span>: Keep track of all pubkey associated with
                corresponding EVM addresses with our new feature.
              </li>
            </ul>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Home;
