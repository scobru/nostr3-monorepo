import type { NextPage } from "next";
import { useWalletClient } from "wagmi";
import Image from "next/image"

const Home: NextPage = () => {
  const { data: signer } = useWalletClient();

  return (
    <div className="flex items-center flex-col flex-grow pt-10 ">
      <div className="w-full">
        <Image className="mb-5 mx-auto" src="/assets/nostr3.png" width={500} height={500} alt="nostr3"></Image>

        {signer?.account ? (
          <div className="m-5  mx-auto w-5/6">
            <h1 className="text-2xl mb-10 font-semibold shadow-inner">NOSTR3</h1>
            <h1 className="text-xl mb-5">generate programmatically key for nostr protocol with your web3 address</h1>
            <p className="text-xl justify-start">
              {" "}
              <strong> Nostr3 </strong>
              is here to make your life easier when dealing with the Nostr protocol! It cleverly generates private keys
              right from your EVM address, taking the hassle out of key storage. Need your keys? Just a quick
              interaction with Nostr3, and you are all set. What&apos;s more, it links your Nostr accounts to your EVM
              accounts, making tipping a breeze for all Nostr accounts set up through Nostr3. While Nostr3 isn&apos;t a
              full-fledged Nostr protocol client, it&apos;s a super handy tool that covers the basics. But hey, for the
              best Nostr experience, we suggest pairing it with open-source clients. Happy Nostring!
            </p>
            <div className="bg-success text-success-content rounded-md mb-4 p-10">
              <h2 className="text-2xl mb-5">🎉Updates</h2>
              <ul className="list-disc">
                <li className="text-lg font-medium">
                  <span className="font-bold">NIP-111</span>: Implementation of NIP-111, which allows for the
                  association of an EVM address with a Nostr3 public key. This allows for the easy transfer of tips
                  between EVM and Nostr3 accounts.
                </li>
                <li className="text-lg font-medium">
                  <span className="font-bold">Implemented NIPS</span>: NIP-02,NIP-04,NIP-07,NIP-10,NIP-18,NIP-25
                </li>
                <li className="text-lg font-medium">
                  <span className="font-bold">Encryption/Decryption Made Easy</span>: Send notes in plain text or
                  encrypted using a recipient&aposs publicKey (or your own). Decryption is simple with the
                  recipient&aposs privateKey.
                </li>
                <li className="text-lg font-medium">
                  <span className="font-bold">Nosrt3 Filter</span>: Easily identify public keys that accept ETH tips and
                  are part of the nostr3 network in your client&aposs feed. They are highlighted and feature a $ button
                  at the bottom.
                </li>
                <li className="text-lg font-medium">
                  <span className="font-bold">Brand New Client Interface</span>: Enjoy a fresh, user-friendly UI,
                  designed for convenience and ease of use.
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
            </div>
            <div className="my-2 break-all text-lg bg-base-100 p-5">
              <div className="font-mono">
                <p>
                  NOSTR3 CUSTOM EVENT
                  <br />
                  <p className="break-all">
                    This is the event emitted by nostr3 when you link your evm account
                    <br />
                    with your nostr pubkey.
                  </p>
                </p>
                {"const messageEvent: any = {"}
                <p className="ml-5">
                  kind: 30078 <br />
                  created_at: Date.now(),
                  <br />
                  {'  tags: [["d", "nostr3"]],'}
                  <br />
                  {"  content: evmAddress,"}
                  <br />
                  {"  pubkey: pubkey,"}
                  <br />
                </p>

                {"};"}
              </div>
            </div>
          </div>
        ) : (
          <div className="font-black m-5">Connect your wallet</div>
        )}
      </div>
    </div>
  );
};

export default Home;
