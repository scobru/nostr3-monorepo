/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import * as secp256k1 from "@noble/secp256k1";
import { Nostr3 } from "@scobru/nostr3";
import sha3 from "js-sha3";
import type { NextPage } from "next";
import {
  Event,
  UnsignedEvent,
  finishEvent,
  generatePrivateKey,
  getEventHash,
  getPublicKey,
  relayInit,
  signEvent,
} from "nostr-tools";
import { nip19 } from "nostr-tools";
import { nip05 } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/lib/types/nip19";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { createWalletClient, http, isAddress, parseEther } from "viem";
import { toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { useEnsName, usePublicClient, useWalletClient } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { notification } from "~~/utils/scaffold-eth";

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<any>;
      signEvent: (event: any) => Promise<any>;
    };
  }
}

const Login: NextPage = () => {
  const { data: signer } = useWalletClient();
  const provider = usePublicClient({
    chainId: signer?.chain.id,
  });
  const [privateKey, setPrivateKey] = useState("");
  const [nostrPrivateKey, setNostrPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [nostrPublicKey, setNostrPublicKey] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [relayURL, setRelayURL] = useState("wss://relay.damus.io"); // Replace with a real relay URL
  const [relay, setRelay] = useState<any>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>({
    name: "",
    display_name: "",
    picture: "",
    banner: "",
    nip05: "",
    website: "",
    about: "",
    image: "",
    lud16: "",
    lud06: "",
  });
  const [profileDetails, setProfileDetails] = useState({
    name: "",
    display_name: "",
    picture: "",
    banner: "",
    nip05: "",
    website: "",
    about: "",
    image: "",
    lud16: "",
    lud06: "",
  });
  const [connected, setConnected] = useState(false);
  const [, setNewMessage] = useState("");
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [nProfile, setNProfile] = useState("");
  const [, setNostr3] = useState<any>(null);
  const [pubKeyReceiver, setPubKeyReceiver] = useState("");
  const [, setEvmAddressReceiver] = useState("");
  const [amountToTip, setAmountToTip] = useState({});
  const [nostrKeys, setNostrKeys] = useState<any>({});
  const [pubKeyEthAddressList, setPubKeyEthAddressList] = useState<any[]>([]);
  const [isExtension, setIsExtension] = useState(false);
  const [evmAddress, setEvmAddress] = useState("");
  const [isNostr3Account, setIsNostr3Account] = useState<boolean>(false);
  const [eventId, setEventId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const openTipModal = () => {
    const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
    if (tip_modal) {
      tip_modal.showModal();
    }
  };

  const openKeysModal = () => {
    const keys_modal = document.getElementById("keys_modal") as HTMLDialogElement;
    if (keys_modal) {
      keys_modal.showModal();
    }
  };

  function getAddress() {
    if (signer) {
      return signer?.account?.address;
    }
  }
  const address = getAddress();

  const { data: fetchedEns } = useEnsName({ address, enabled: isAddress(address ?? ""), chainId: 1 });

  //::Profile

  const ProfileDetailsBox = () => {
    return (
      <div className="profile-details-box bg-base-100 rounded-md p-5 my-10 flex flex-col items-center text-center">
        {profileDetails && profileDetails.display_name && (
          <div>
            {profileDetails.picture && (
              <LazyLoadImage src={profileDetails.picture} className="rounded-full w-24 mx-auto" alt="Profile" />
            )}
            <h3 className="font-bold text-lg mb-4">{profileDetails.display_name}</h3>
            <p className="text-md">{profileDetails.about}</p>
          </div>
        )}
        <button className="btn text-left mb-5" onClick={() => openKeysModal()}>
          Show Keys
        </button>
        <dialog id="keys_modal" className="modal bg-gradient-to-br from-primary to-secondary">
          <div className="modal-box">
            <div className="w-fit bg-base-100 text-base-content rounded-lg p-5 text-left break-all mt-4">
              <ul className="space-y-2">
                {publicKey && (
                  <li className="font-bold border-b border-primary-content p-2">
                    Public Key: <span className="font-normal">{publicKey}</span>
                  </li>
                )}
                {privateKey && (
                  <li className="font-bold border-b border-primary-content p-2">
                    Private Key: <span className="font-normal">{privateKey}</span>
                  </li>
                )}
                {nostrPublicKey && (
                  <li className="font-bold border-b border-primary-content p-2">
                    NIP19 Public Key: <span className="font-normal">{nostrPublicKey}</span>
                  </li>
                )}
                {nostrPrivateKey && (
                  <li className="font-bold border-b border-primary-content p-2">
                    NIP19 Private Key: <span className="font-normal">{nostrPrivateKey}</span>
                  </li>
                )}
                {nProfile && (
                  <li className="font-bold p-2">
                    NIP19 Nostr Profile: <span className="font-normal">{nProfile}</span>
                  </li>
                )}
                {wallet && (
                  <li className="font-bold p-2">
                    EVM Address: <span className="font-normal">{wallet?.account?.address}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="modal-action">
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button className="btn">Close</button>
              </form>
            </div>
          </div>
        </dialog>

        <span className="block my-4 text-xl">
          {" "}
          Link an EVM address to your Nostr account. You can change it any time.
        </span>
        {/* <input
          type="text"
          className="input input-primary my-5"
          id="EvmAddress"
          placeholder="Set Evm address"
          value={evmAddress}
          onChange={e => setEvmAddress(e.target.value)}
        /> */}
        <AddressInput onChange={e => setEvmAddress(e)} value={evmAddress} />
        {!isNostr3Account ? (
          <div>
            <label className="btn btn-ghost  mr-2 md:mr-4 lg:mr-6 mt-5 bg-success text-black" onClick={handleSignIn}>
              REGISTER
            </label>
          </div>
        ) : (
          <div>
            <button
              className="btn btn-ghost  mr-2 md:mr-4 lg:mr-6 mt-5 bg-success text-black"
              onClick={() => openTipModal()}
            >
              Tip
            </button>
          </div>
        )}
      </div>
    );
  };

  const loadProfile = async (loadedPubKey: any) => {
    try {
      const result = await relay.list([{ kinds: [0], authors: [loadedPubKey], limit: 50 }]);
      const parsedResult = JSON.parse(result[0].content);
      if (result && result[0] && result[0].content) {
        return parsedResult;
      } else {
        console.warn("Nessun profilo trovato o dati non validi per la chiave:", loadedPubKey);
        return null; // Restituisci null se non ci sono dati validi
      }
    } catch (error) {
      console.error("Errore nel caricamento del profilo:", error);
      return null; // Gestisci l'errore restituendo null o un valore di default
    }
  };

  //::Tip

  const createEvent = (unsignedEvent: UnsignedEvent, _sk: string): Event => {
    const eventHash = getEventHash(unsignedEvent);
    const signature = signEvent(unsignedEvent, _sk);
    return {
      ...unsignedEvent,
      id: eventHash,
      sig: signature,
    };
  };

  const publishEvent = async (event: UnsignedEvent, _sk: string) => {
    const signedEvent = createEvent(event, _sk);
    await relay?.publish(signedEvent);
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

      // Check if the transaction was successfully mined
      if (receipt && txResponse) {
        if (eventId === "") {
          message = `Tip ${amountToTip} ETH to ${pubKeyReceiver} txHash: ${txResponse}`;
          newEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["t", "nostr3", "tip"],
              ["p", pubKeyReceiver],
            ],
            content: message,
            pubkey: publicKey,
          };
        } else {
          message = `Tip ${amountToTip} OPETH to ${pubKeyReceiver} for event ${eventId} txHash: ${txResponse}`;
          const id = nip19.decode(eventId).data;
          newEvent = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["t", "nostr3", "tip"],
              ["e", id],
              ["p", pubKeyReceiver],
            ],
            content: message,
            pubkey: publicKey,
          };
        }

        if (!isExtension) {
          await publishEvent(newEvent as UnsignedEvent, privateKey);
        } else {
          const signedEvent = window.nostr.signEvent(newEvent);
          await relay?.publish(signedEvent);
        }
        notification.success("Tip sent");
      }
    } catch (error) {
      console.error("Error during transaction:", error);
      notification.error("Failed to send tip");
    } finally {
      const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
      if (tip_modal) {
        tip_modal.close();
      }
    }
  };

  //::Search

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

  /* const handleSearchFromEVMtoRelay = async (pubKey: string) => {
    await handleConnectRelay();
    const events = await relay.list([{ kinds: [30078], authors: [pubKey] }]);
    if (events.length === 0) return null;
    setEvmAddressReceiver(events[0].content);
    return events[0].content;
  }; */

  /* const handleListAllPubkeyAndEthAddress = async () => {
    const _events = await relay.list([{ kinds: [30078], tags: [["d", "nostr3"]] }]);
    console.log("Events", _events);
    // sort event by date recent
    const _eventsSort = _events.sort(
      (a: { created_at: number }, b: { created_at: number }) => b.created_at - a.created_at,
    );
    //if (events.length === 0) return null;
    const eventResult: { pubkey: string; npub: string; evmAddress: string }[] = [];
    // create a paggin with event.content and event.pubkey
    _eventsSort.map((event: Event) => {
      // only event.content start with 0x
      if (event.kind != 30078) return null;
      if (event.content.slice(0, 2) !== "0x") return null;
      eventResult.push({ pubkey: event.pubkey, npub: nip19.npubEncode(event.pubkey), evmAddress: event.content });

      // set global state
    });

    useGlobalState.setState({ nostr3List: eventResult });
    setPubKeyEthAddressList(eventResult);
    return eventResult;
  }; */

  /* function getPublicKeyFromSecret(
    secretKey: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string },
  ) {
    const pk = secp256k1.getPublicKey(Buffer.from(secretKey, "hex"), false).slice(1);
    return pk;
  }

  function doesNostrKeyCorrespondToEthereumAddress(
    nostrPubKeyArray: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>,
    ethAddress: string,
  ) {
    // Convert decimal array to Buffer
    const nostrPubKey = Buffer.from(nostrPubKeyArray);

    ethAddress = ethAddress.toLowerCase().replace("0x", "");

    for (const prefix of ["0x02", "0x03"]) {
      const pkBytes = Buffer.concat([Buffer.from(prefix, "hex"), nostrPubKey]);
      if (pkBytes.length !== 33) continue; // Ensure correct length for publicKeyConvert

      try {
        const uncompressed = secp256k1.getPublicKey(pkBytes, false);
        const hash = sha3.keccak256.array(uncompressed.slice(1));
        const resH = Buffer.from(hash).toString("hex");

        if (resH.slice(24) === ethAddress) {
          return true;
        }
      } catch (err) {
        // Handle or log the error as needed
        continue;
      }
    }
    return false;
  }*/

  const handleSearchFromPubkey = async (pubKey: string) => {
    const wallet = createWalletClient({
      account: privateKeyToAccount(("0x" + privateKey) as any),
      chain: optimism,
      transport: http(),
    });
    const evmAddress = await wallet?.account?.address;
    setWallet(wallet);
    setEvmAddress(evmAddress);
  };

  const handleRegisterEVM = async (keys: { pub: any; sec: string }) => {
    const messageEvent: any = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", "nostr3"]],
      content: wallet?.account?.address,
      pubkey: keys.pub,
    };
    const signedEvent = finishEvent(messageEvent, keys.sec);
    await relay.publish(signedEvent);
    setNewMessage(""); // Reset the input field after sending

    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [30078] }]);

    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });
  };

  const handleRegisterEVMExtension = async () => {
    const messageEvent: any = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["d", "nostr3"]],
      content: evmAddress,
      pubkey: publicKey,
    };
    const signedEvent = await window.nostr.signEvent(messageEvent);
    await relay.publish(signedEvent);
    setNewMessage(""); // Reset the input field after sending

    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [30078] }]);

    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });
  };

  //::Handlers

  const handleConnectWithKeyPair = async () => {
    //const _pubKey = await window.nostr.getPublicKey();
    setIsExtension(true);
    handleSearchFromPubkey(publicKey);
    setNostrPublicKey(nip19.npubEncode(publicKey));
    setNProfile(nip19.nprofileEncode({ pubkey: publicKey }));

    useGlobalState.setState({ nostrKeys: "" });

    setNostrPrivateKey("");
    setEvmAddress("");
    setWallet("");
  };

  const handleConnectExtension = async () => {
    const list = await handleGetList();

    const _pubKey = await window.nostr.getPublicKey();
    setIsExtension(true);
    setPublicKey(_pubKey);
    setNostrPublicKey(nip19.npubEncode(_pubKey));
    setNProfile(nip19.nprofileEncode({ pubkey: _pubKey }));
    useGlobalState.setState({ nostrKeys: "" });

    const isNostr3Account = list?.some(item => item.pubkey === _pubKey) as boolean;

    // Wait until the EVM address is found
    const _evmAddress = await list?.find(item => item.pubkey === _pubKey);
    console.log(_evmAddress?.evmAddress);
    setEvmAddress(_evmAddress?.evmAddress);
    setIsNostr3Account(isNostr3Account);
    setPrivateKey("");
    setNostrPrivateKey("");
    setWallet("");
  };

  const reload = async () => {
    const id = notification.loading("Reload");
    await handleFetchEvents();
    //await handleListAllPubkeyAndEthAddress();
    notification.remove(id);
    notification.success("Fetch Complete");
    await handleGetList();
  };

  const handleFetchEvents = async () => {
    const _events = await relay.list([{ kinds: [30078] }]);
    // sort event by date recent
    const _eventsSort = _events.sort(
      (a: { created_at: number }, b: { created_at: number }) => b.created_at - a.created_at,
    );

    setEvent(_eventsSort);
  };

  //::UseEffect

  useEffect(() => {
    const run = async () => {
      if (fetchedEns) {
        setUsername(fetchedEns);
      }
    };
    run();
  }, [signer]);

  useEffect(() => {
    if (connected && pastEvents.length === 0 && publicKey) {
      const run = async () => {
        try {
          const profileData = await loadProfile(publicKey);
          setProfileDetails(profileData);
          //await handleListAllPubkeyAndEthAddress();
          await handleGetList();
        } catch (error) {
          notification.error("Error loading profile");
        }
      };
      run();
    }
  }, [connected, nostrKeys]);

  useEffect(() => {
    const globalNostrKeys = useGlobalState.getState().nostrKeys;
    if (globalNostrKeys && globalNostrKeys.sec) {
      setPrivateKey(globalNostrKeys.sec);
      setNostrPrivateKey(globalNostrKeys.nsec);
      setPublicKey(getPublicKey(globalNostrKeys.sec));
      setNostrPublicKey(globalNostrKeys.npub);
      setNProfile(globalNostrKeys.nprofile);
      const pkHex = "0x" + globalNostrKeys.sec;
      const newWallet = createWalletClient({
        account: privateKeyToAccount(pkHex as any),
        chain: optimism,
        transport: http(),
      });
      setWallet(newWallet);
      setEvmAddress(newWallet?.account?.address);
      const isNostr3Account = pubKeyEthAddressList.some(
        (item: { pubkey: string }) => item.pubkey === globalNostrKeys.pub,
      );
      setIsNostr3Account(isNostr3Account);
    } else if (nostrKeys) {
      const isNostr3Account = pubKeyEthAddressList.some((item: { pubkey: string }) => item.pubkey === nostrKeys.pub);
      setIsNostr3Account(isNostr3Account);
    }
  }, [nostrKeys]);

  useEffect(() => {
    if (relay && relay.status == 3) {
      setConnected(false);
    } else if (relay && relay.status == 1) {
      setConnected(true);
    }
  }, [relay]);

  useEffect(() => {
    handleConnectRelay();
  }, []);

  //::NIP-111
  async function privateKeyFromX(
    username: string,
    caip10: string,
    sig: string,
    password: string | undefined,
  ): Promise<string> {
    if (sig.length < 64) throw new Error("Signature too short");
    const inputKey = sha256(secp256k1.etc.hexToBytes(sig.toLowerCase().startsWith("0x") ? sig.slice(2) : sig));
    const info = `${caip10}:${username}`;
    const salt = sha256(`${info}:${password ? password : ""}:${sig.slice(-64)}`);
    const hashKey = await hkdf(sha256, inputKey, salt, info, 42);
    return secp256k1.etc.bytesToHex(secp256k1.etc.hashToPrivateKey(hashKey));
  }

  async function signInWithX(
    username: string,
    caip10: string,
    sig: string,
    password: string | undefined,
  ): Promise<{
    petname: string;
    profile: ProfilePointer | null;
    pubkey: string;
    privkey: string;
  }> {
    let profile = null;
    let petname = username;

    if (username.includes(".")) {
      try {
        profile = await nip05.queryProfile(username);
      } catch (e) {
        console.log(e);
        throw new Error("Nostr Profile Not Found");
      }
      if (profile == null) {
        throw new Error("Nostr Profile Not Found");
      }
      petname = username.split("@").length == 2 ? username.split("@")[0] : username.split(".")[0];
    }

    const privkey = await privateKeyFromX(petname, caip10, sig, password);
    const pubkey = getPublicKey(privkey);

    if (profile?.pubkey && pubkey !== profile.pubkey) {
      throw new Error("Invalid Signature/Password");
    }

    return {
      petname,
      profile,
      pubkey,
      privkey,
    };
  }

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const generateKeyPairFromSeed = async () => {
    const chainId = await signer?.getChainId();
    const _address = await signer?.account?.address;
    const petname = username.split("@").length == 2 ? username.split("@")[0] : username.split(".")[0];

    try {
      const info = `eip155:${chainId}:${_address}`;
      const statement = `Log into Nostr client as '${petname}'\n\nIMPORTANT: Please verify the integrity and authenticity of connected Nostr client before signing this message\n\nSIGNED BY: ${info}`;
      const signature = (await signer?.signMessage({ message: statement })) as string;
      const pkSlice = toHex(privateKey).slice(2).slice(64);
      const nostr3 = new Nostr3(privateKey);
      const siwe = await nostr3.signInWithX(petname, info, signature, password);

      console.log(siwe);

      const kp = {
        publicKey: siwe.pubkey,
        secretKey: siwe.privkey,
      };

      return kp;
    } catch (err) {
      console.log("❌ Failed to Sign: " + err);
      return {
        data: "",
        status: "❌ Failed to Sign: " + err,
      };
    }
  };

  const handleSignIn = async () => {
    const id = notification.loading("Process");
    if (!isExtension) {
      await fetch("/api/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evmAddress: await wallet?.account?.address,
          pubKey: publicKey,
        }),
      });

      await handleRegisterEVM(nostrKeys);
    } else {
      await handleRegisterEVMExtension();

      await fetch("/api/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evmAddress: evmAddress,
          pubKey: publicKey,
        }),
      });
    }
    notification.remove(id);
    notification.success("Send");
  };

  const handleGenerateRandomKeys = async () => {
    const sk = generatePrivateKey();
    const pk = getPublicKey(sk);

    const pkSlice = toHex(sk).slice(2).slice(64);
    const nostr3 = new Nostr3(pkSlice);
    const nostrKeys = nostr3.generateNostrKeys();

    setNostrPrivateKey(nostrKeys.nsec);
    setPublicKey(getPublicKey(nostrKeys.sec));
    setPrivateKey(nostrKeys.sec);
    setNostrPublicKey(nostrKeys.npub);
    setNProfile(nostrKeys.nprofile);
    setNostr3(nostr3);
    useGlobalState.setState({ nostrKeys: nostrKeys });
    setNostrKeys(nostrKeys);

    const pkHex = "0x" + nostrKeys.sec;

    const newWallet = createWalletClient({
      account: privateKeyToAccount(pkHex as any),
      chain: optimism,
      transport: http(),
    });

    setWallet(newWallet);
    setEvmAddress(await newWallet?.account?.address);
    setIsExtension(false);
    try {
      const profileData = await loadProfile(nostrKeys.pub);
      setProfileDetails(profileData);
    } catch (error) {
      notification.error("Error loading profile");
    }
  };

  const handleGenerateKeys = async () => {
    //const sk = generatePrivateKey();
    const kp = (await generateKeyPairFromSeed()) as { publicKey: string; secretKey: string };
    const pkSlice = toHex(kp.secretKey).slice(2).slice(64);
    const nostr3 = new Nostr3(pkSlice);
    const nostrKeys = nostr3.generateNostrKeys();

    setNostrPrivateKey(nostrKeys.nsec);
    setPublicKey(getPublicKey(nostrKeys.sec));
    setPrivateKey(nostrKeys.sec);
    setNostrPublicKey(nostrKeys.npub);
    setNProfile(nostrKeys.nprofile);
    setNostr3(nostr3);
    useGlobalState.setState({ nostrKeys: nostrKeys });
    setNostrKeys(nostrKeys);

    const pkHex = "0x" + nostrKeys.sec;

    const newWallet = createWalletClient({
      account: privateKeyToAccount(pkHex as any),
      chain: optimism,
      transport: http(),
    });

    setWallet(newWallet);
    setEvmAddress(await newWallet?.account?.address);
    setIsExtension(false);

    try {
      const profileData = await loadProfile(nostrKeys.pub);
      setProfileDetails(profileData);
    } catch (error) {
      notification.error("Error loading profile");
    }
  };

  //::Relay
  const handleConnectRelay = async () => {
    const relay = relayInit(relayURL);
    relay.on("connect", async () => {
      console.log(`Connected to ${relay.url}`);
      // Subscribe to events authored by your public key
      setConnected(true);
      const sub = relay.sub([
        {
          authors: [publicKey], // Your public key
        },
      ]);
      sub.on("event", event => {
        // Handle incoming events (you can add them to state or process them as needed)
        // console.log("Event received:", event);
        setPastEvents([...pastEvents, event]);
      });
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

  const filteredPubKeyEthAddressList = searchTerm
    ? pubKeyEthAddressList.filter(item => item.npub.toLowerCase().includes(searchTerm.toLowerCase()))
    : pubKeyEthAddressList;

  return (
    <div className="flex items-center flex-col flex-grow pt-10 w-full sm:w-4/5 md:w-3/4 lg:w-3/6 mx-auto">
      <div className="w-full">
        {signer?.account ? (
          <div className="m-5  mx-auto w-5/6">
            {privateKey == "" ? (
              <div>
                <span className="block text-grey-800 font-semibold mx-5 my-2">LOGIN WITH WALLET</span>
                <nav className="flex flex-wrap p-8 text-center mx-auto w-auto bg-base-300 rounded-lg mb-8 gap-4">
                  <input
                    type="text"
                    className="input input-primary mr-2 md:mr-4 lg:mr-6"
                    id="username"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                  <input
                    type="password"
                    className="input input-primary  mr-2 md:mr-4 lg:mr-6"
                    id="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleGenerateKeys}>
                    Generate Keypair
                  </label>
                </nav>
                <span className="block text-grey-800 font-semibold mx-5 my-2">LOGIN WITH NOS2x OR KEYPAIR</span>
                <nav className="flex flex-wrap p-8 gap-4 text-center mx-auto w-auto bg-base-300 rounded-lg my-2">
                  <input
                    type="text"
                    className="input input-primary mr-2 md:mr-4 lg:mr-6 "
                    id="username"
                    placeholder="PublicKey"
                    value={publicKey}
                    onChange={e => setPublicKey(e.target.value)}
                  />
                  <input
                    type="password"
                    className="input input-primary  mr-2 md:mr-4 lg:mr-6 "
                    id="password"
                    placeholder="PrivateKey"
                    value={privateKey}
                    onChange={e => setPrivateKey(e.target.value)}
                  />
                  <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6 " onClick={handleConnectWithKeyPair}>
                    Login with keyPair
                  </label>
                  <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6 " onClick={handleConnectExtension}>
                    Login With extension
                  </label>
                  <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6 " onClick={handleGenerateRandomKeys}>
                    Generate Random
                  </label>
                </nav>
              </div>
            ) : null}
            {connected ? (
              <p className="mb-4 text-bold text-xl text-success">📡 Connected</p>
            ) : (
              <p className="mb-4 text-bold text-xl text-success">Not Connected</p>
            )}
            <ProfileDetailsBox />
            <nav className="flex flex-wrap p-4">
              <button className="btn btn-success mr-2 md:mr-4 lg:mr-6" onClick={reload}>
                Refresh
              </button>
              <button
                className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                onClick={() => {
                  const relayModal = document?.getElementById("relay_modal") as HTMLDialogElement;
                  relayModal?.showModal();
                }}
              >
                Relay
              </button>
              <dialog id="relay_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mb-4">RELAY</h1>
                  <button
                    className=" w-full  btn btn-primary mb-5"
                    onClick={() => {
                      const relay_modal = document.getElementById("relay_modal") as HTMLDialogElement;
                      if (relay_modal) relay_modal;
                      setRelayURL("wss://relay.damus.io");
                      handleConnectRelay();
                    }}
                  >
                    Connect Relays
                  </button>
                  <button
                    className=" w-full  btn btn-primary mb-5"
                    onClick={() => {
                      relay.close();
                      setConnected(false);
                    }}
                  >
                    Disconnect
                  </button>
                  <div className="modal-action">
                    <div className="modal-action">
                      <form method="dialog">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn">Close</button>
                      </form>
                    </div>
                  </div>
                </div>
              </dialog>{" "}
            </nav>
            {event && event.created && (
              <div className="bg-success p-5 text-black rounded-md mb-4">
                <h2 className="text-2xl mb-2">🎉 Posted!</h2>
                <p className="mb-2 text-lg font-medium">{event.created.content}</p>
              </div>
            )}
            <div>
              {filteredPubKeyEthAddressList && (
                <div className="bg-base-100 text-base-content rounded-md mb-4 p-10 break-all">
                  <h2 className="block font-semibold text-4xl mb-5">NOSTR3 ACCOUNTS</h2>
                  <input
                    type="text"
                    placeholder="Search by Nostr Public Key..."
                    className="input input-bordered w-full mb-4"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <table className="table-auto w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Nostr Public Key</th>
                        <th className="px-4 py-2">EVM Address</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPubKeyEthAddressList.map((item: any, index: any) => (
                        <tr key={index}>
                          <td className="border px-4 py-2">
                            <div className="lg:tooltip" data-tip={item.npub}>
                              <Link href={`https://njump.me/${item.npub}`} target="_blank">
                                {item.npub.slice(0, 10)}
                              </Link>
                            </div>
                          </td>

                          <td className="border px-4 py-2">
                            <div className="lg:tooltip" data-tip={item.evmAddress}>
                              {item.evmAddress.slice(0, 10)}
                            </div>
                          </td>

                          <td className="border px-2 py-2">
                            <button
                              className="btn btn-ghost"
                              onClick={() => {
                                openTipModal(), setPubKeyReceiver(item.pubkey);
                              }}
                            >
                              TIP
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="font-black m-5">Connect your wallet</div>
        )}
      </div>
      <dialog id="tip_modal" className="modal bg-gradient-to-br from-primary to-secondary">
        <div className="modal-box">
          <div className="flex flex-col font-black text-2xl mb-4 mx-auto items-center justify-center">TIP</div>

          <input
            type="text"
            value={eventId}
            onChange={event => setEventId(event.target.value)}
            className="input input-primary w-full mb-4"
            placeholder="Note ID"
          />
          <input
            type="text"
            value={pubKeyReceiver}
            onChange={event => setPubKeyReceiver(event.target.value)}
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
              const receiver = pubKeyEthAddressList.find(
                (item: { pubkey: string }) => item.pubkey === pubKeyReceiver,
              )?.evmAddress;
              setEvmAddress(evmAddress);
              if (receiver) {
                await handleTip(receiver);
              } else {
                notification.error("Profile not registred");
              }
            }}
          >
            Send
          </button>
          <div className="modal-action">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default Login;
