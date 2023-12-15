import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NextPage } from "next";
import { Relay, nip19, relayInit } from "nostr-tools";
import { keccak256, parseEther } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { notification } from "~~/utils/scaffold-eth";

// Import other necessary hooks and services

declare global {
  interface Window {
    nostr: {
      nip04: any;
      getPublicKey: () => Promise<any>;
      signEvent: (event: any) => Promise<any>;
      encrypt: (data: string, key: string) => Promise<any>;
      decrypt: (data: string, key: string) => Promise<any>;
    };
  }
}

const Tip: NextPage = () => {
  const router = useRouter();
  const { npub, nnote } = router.query;
  const [, setIsNpubValid] = useState(false);
  const { data: signer } = useWalletClient();
  const provider = usePublicClient({
    chainId: signer?.chain.id,
  });

  const [pubKeyEthAddressList, setPubKeyEthAddressList] = useState<any[]>([]);
  const [amountToTip, setAmountToTip] = useState("0");
  const [publicKey, setPublicKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [relay, setRelay] = useState<Relay>();
  const [isRegistred, setIsRegistred] = useState(false);
  const [consoleMessage, setConsoleMessage] = useState("");
  const { data: nostr3ctx } = useScaffoldContract({
    contractName: "Nostr3",
    walletClient: signer,
  });

  const handleGetList = async () => {
    try {
      const url = `/api/getAll`;

      const verifiedResult = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!verifiedResult.ok) {
        throw new Error(`HTTP error! Status: ${verifiedResult.status}`);
      }

      const resultJson = await verifiedResult.json();

      if (!resultJson.data) {
        throw new Error("No data found in the response");
      }

      const resultPromises = resultJson.data.map(async (resultData: { content: string; id: any }) => {
        try {
          const content = JSON.parse(resultData.content);
          return {
            evmAddress: resultData.id,
            pubkey: content.pubKey,
            npub: nip19 ? nip19.npubEncode(content.pubKey) : undefined,
          };
        } catch (error) {
          console.error("Error processing resultData: ", error);
          return null;
        }
      });

      const result = (await Promise.all(resultPromises)).filter(item => item !== null);

      setPubKeyEthAddressList(result);

      //setNostr3List(result);
      useGlobalState.setState({ nostr3List: result });

      return result;
    } catch (error) {
      console.error("Error fetching public key:", error);
      // Ensure notification is a valid function/object in your context
      notification.error("Error fetching public key");
      return null; // or appropriate fallback value
    }
  };

  const handleConnectRelay = async () => {
    const relay = relayInit("wss://relay.primal.net");
    relay.on("connect", async () => {
      console.log(`Connected to ${relay.url}`);
      // Subscribe to events authored by your public key
      setConnected(true);
      const sub = relay.sub([
        {
          authors: [String(publicKey)], // Your public key
        },
      ]);

      sub.on("eose", () => {
        sub.unsub();
      });
    });
    relay.on("error", () => {
      console.error(`Failed to connect to ${relay.url}`);
      setConnected(false);
    });

    await relay.connect();
    setRelay(relay);

    return true;
  };

  const handleTip = async (receiver: any) => {
    let message;
    let newEvent;

    try {
      const txResponse = await signer?.sendTransaction({
        to: receiver,
        value: parseEther(String(amountToTip)),
      });

      if (!txResponse) {
        throw new Error("Failed to send transaction");
      }

      const receipt = await provider.waitForTransactionReceipt({
        hash: txResponse,
      });

      const decoded = nip19.decode(String(npub));

      // Check if the transaction was successfully mined
      if (receipt && txResponse) {
        if (nnote === "") {
          message = `Tip ${amountToTip} ETH to ${npub} txHash: ${txResponse}`;
          newEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["t", "nostr3", "tip"],
              ["p", decoded.data],
            ],
            content: message,
            pubkey: publicKey,
          };
        } else {
          message = `Tip ${amountToTip} OPETH to ${npub} for event ${nnote} txHash: ${txResponse}`;
          const id = nip19.decode(String(nnote)).data;
          newEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["t", "nostr3", "tip"],
              ["e", id],
              ["p", decoded.data],
            ],
            content: message,
            pubkey: publicKey,
          };
        }

        const signedEvent = await window.nostr.signEvent(newEvent);
        await relay?.publish(signedEvent as any);
        notification.success("Tip sent");
      }
    } catch (error) {
      console.error("Error during transaction:", error);
      notification.error("Failed to send tip");
    }
  };

  function generateRandomPassword(maxLength = 20) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";

    for (let i = 0; i < maxLength; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return password;
  }

  const handleTipNotRegistred = async (
    pubkey: string | nip19.ProfilePointer | nip19.EventPointer | nip19.AddressPointer,
  ) => {
    const key = generateRandomPassword();
    const message = `Tip ${amountToTip} ETH to ${npub}. Use this key to retrive your tip: ${key}`;

    const encrypted = await window.nostr.nip04.encrypt(pubkey, message);

    const newEvent = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", pubkey]],
      content: encrypted,
      pubkey: publicKey,
    };
    console.log(newEvent, encrypted);
    const hash = keccak256(String(key) as any);

    await nostr3ctx?.write?.deposit([hash], { value: parseEther(String(amountToTip)) });

    const signedEvent = await window.nostr.signEvent(newEvent);
    await relay?.publish(signedEvent);
  };

  useEffect(() => {
    // Function to verify npub
    const verifyNpub = async () => {
      const events = await handleGetList();
      const decoded = nip19.decode(String(npub));
      const isValid = events?.some(item => item.pubkey === decoded.data) as boolean;
      setIsNpubValid(isValid);
    };

    if (npub) {
      verifyNpub();
    }
  }, [npub]);

  const setPubKeyAndCheck = async () => {
    const _pubKey = await window.nostr.getPublicKey();
    console.log(_pubKey);
    setPublicKey(String(_pubKey));
    const events = await handleGetList();
    const isValid = events?.some(item => item.pubkey === _pubKey) as boolean;
    setIsRegistred(isValid);
  };

  useEffect(() => {
    if (!publicKey) {
      setPubKeyAndCheck();
    }
  }, [publicKey, connected]);

  /* useEffect(() => {
    // Auto-tip if wallet is connected and npub is valid
    const autoTip = async () => {
      if (signer && isNpubValid) {
      }
    };

    autoTip();
  }, [signer, isNpubValid, npub, nnote]); */ handleConnectRelay;

  useEffect(() => {
    handleConnectRelay();
  }, []);

  useEffect(() => {
    const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
    if (tip_modal) {
      tip_modal.showModal();
    }
  }, [signer]);

  return (
    <div className="flex flex-col mx-auto w-3/6 items-center justify-center">
      {signer ? (
        <div>
          {!isRegistred ? (
            <div>Registerd {publicKey}</div>
          ) : (
            <div className="mx-auto items-center text-4xl text-center">Thanks for using nostr3.</div>
          )}
          <dialog id="tip_modal" className="modal bg-gradient-to-br from-secondary  to-slate-900">
            <div className="modal-box shadow-base-300 shadow-xl">
              <div className="flex flex-col font-black text-4xl mb-4 mx-auto items-center justify-center">NOSTR3</div>

              <input type="text" value={nnote} className="input input-primary w-full mb-4" placeholder="Note ID" />
              <input
                type="text"
                value={npub}
                className="input input-primary w-full mb-4"
                placeholder="Public Key Receiver"
              />
              <input
                type="text"
                onChange={event => setAmountToTip(event.target.value)}
                className="input input-primary w-full mb-2"
                placeholder="Amount to tip"
              />
              <button
                className="btn btn-primary mt-4"
                onClick={async () => {
                  setConsoleMessage("Sending tip...");
                  const decoded = nip19.decode(String(npub));
                  const receiver = pubKeyEthAddressList.find(
                    (item: { pubkey: string }) => item.pubkey === decoded.data,
                  )?.evmAddress;
                  if (receiver) {
                    setConsoleMessage("Start Tx...");
                    await handleTip(receiver);
                  } else {
                    setConsoleMessage("Start Tx...");
                    await handleTipNotRegistred(decoded.data);
                  }
                  setConsoleMessage("Tip Complete");
                  // redirect to login
                  router.push("/login");
                }}
              >
                Send
              </button>
              <span className="font-thin my-3 text-xl"> {consoleMessage}</span>
              <div className="modal-action">
                <form method="dialog">
                  {/* if there is a button in form, it will close the modal */}
                  <button className="btn">Close</button>
                </form>
              </div>
            </div>
          </dialog>
        </div>
      ) : (
        "Connect Your Wallet"
      )}
    </div>
  );
};

export default Tip;
