/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import * as secp256k1 from "@noble/secp256k1";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import sha3 from "js-sha3";
import type { NextPage } from "next";
import { finishEvent, generatePrivateKey, getPublicKey, relayInit } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { nip05 } from "nostr-tools";
import { ProfilePointer } from "nostr-tools/lib/types/nip19";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { createWalletClient, http, isAddress, parseEther } from "viem";
import { toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { useEnsName, useWalletClient } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { notification } from "~~/utils/scaffold-eth";

//import MecenateHelper from "@scobru/crypto-ipfs";
//import { keccak256 ,toBytes} from "viem";

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

  const openTipModal = () => {
    const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
    if (tip_modal) {
      tip_modal.showModal();
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
      <div className="profile-details-box bg-base rounded-ms p-5 my-10 flex flex-col items-center text-center w-3/8">
        {profileDetails && profileDetails.display_name && (
          <div>
            {profileDetails.picture && (
              <LazyLoadImage src={profileDetails.picture} className="rounded-full w-24 mx-auto" alt="Profile" />
            )}
            <h3 className="font-bold text-lg mb-4">{profileDetails.display_name}</h3>
            <p className="text-md">{profileDetails.about}</p>
          </div>
        )}
        <button className="btn text-left mb-5" onClick={() => setShowKeys(!showKeys)}>
          {showKeys ? "Hide Keys" : "Show Keys"}
        </button>
        {showKeys && (
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
        )}
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
        <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6 mt-5" onClick={handleSignIn}>
          REGISTER
        </label>
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

  //   const loadEvmProfile = async (loadedPubKey: any) => {
  //     try {
  //       const result = await relay.list([{ kinds: [0], authors: [loadedPubKey] }]);
  //       if (result && result[0] && result[0].content) {
  //         return JSON.parse(result[0].content);
  //       } else {
  //         console.warn("Nessun profilo trovato o dati non validi per la chiave:", loadedPubKey);
  //         return null; // Restituisci null se non ci sono dati validi
  //       }
  //     } catch (error) {
  //       console.error("Errore nel caricamento del profilo:", error);
  //       return null; // Gestisci l'errore restituendo null o un valore di default
  //     }
  //   };

  //::Tip

  const handleTip = async (receiver: any) => {
    await signer?.sendTransaction({
      to: receiver,
      value: parseEther(String(amountToTip)),
    });
    notification.success("Tip sent");
    const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
    if (tip_modal) {
      tip_modal.close();
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
    } catch (error) {
      console.error("Error fetching public key:", error);
      // Ensure notification is a valid function/object in your context
      notification.error("Error fetching public key");
      return null; // or appropriate fallback value
    }
  };

  const handleSearchFromEVMtoRelay = async (pubKey: string) => {
    await handleConnectRelay();
    const events = await relay.list([{ kinds: [30078], authors: [pubKey] }]);
    if (events.length === 0) return null;
    setEvmAddressReceiver(events[0].content);
    return events[0].content;
  };

  interface Event {
    content: string;
    pubkey: string;
    kind: number;
  }

  const handleListAllPubkeyAndEthAddress = async () => {
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
  };

  function getPublicKeyFromSecret(
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
  }

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

  const handleChangeMetadata = async () => {
    const data = {
      name: metadata.name,
      display_name: metadata.display_name,
      website: metadata.website,
      about: metadata.about,
      picture: metadata.picture,
      image: metadata.image,
      banner: metadata.banner,
      nip05: metadata.nip05,
      lud06: metadata.lud06,
      lud16: metadata.lud16,
      mastodonUrl: metadata.mastodonUrl,
    };
    const newEvent = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(data),
      pubkey: publicKey,
    };

    // Sign and finalize the event
    const signedEvent = finishEvent(newEvent, privateKey);
    console.log(signedEvent);
    // Publish the signed event
    await relay.publish(signedEvent);
    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [1] }]);
    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });

    //relay.close();
  };

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
    const _pubKey = await window.nostr.getPublicKey();
    setIsExtension(true);
    setPublicKey(_pubKey);
    setNostrPublicKey(nip19.npubEncode(_pubKey));
    setNProfile(nip19.nprofileEncode({ pubkey: _pubKey }));
    useGlobalState.setState({ nostrKeys: "" });
    setPrivateKey("");
    setNostrPrivateKey("");
    setEvmAddress("");
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

    console.log(_events);

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
    if (connected && pastEvents.length === 0) {
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
    }
  }, []);

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

      const siwe = await signInWithX(petname, info, signature, password);

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

  const updateMetadata = (key: string, value: string) => {
    setMetadata({ ...metadata, [key]: value });
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10 ">
      <div className="w-full">
        {signer?.account ? (
          <div className="m-5  mx-auto w-5/6">
            <span className="block text-grey-800 font-semibold mx-5 my-2">LOGIN</span>
            <nav className="flex flex-wrap p-4 text-center mx-auto w-auto bg-base-300 rounded-lg">
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
            <nav className="flex flex-wrap p-4 text-center mx-auto w-auto bg-base-300 rounded-lg my-2">
              <input
                type="text"
                className="input input-primary mr-2 md:mr-4 lg:mr-6"
                id="username"
                placeholder="PublicKey"
                value={publicKey}
                onChange={e => setPublicKey(e.target.value)}
              />
              <input
                type="password"
                className="input input-primary  mr-2 md:mr-4 lg:mr-6"
                id="password"
                placeholder="PrivateKey"
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
              />
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleConnectWithKeyPair}>
                Login with keyPair
              </label>
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleConnectExtension}>
                Login With extension
              </label>
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleGenerateRandomKeys}>
                Generate Random
              </label>
            </nav>
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
              <button className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={() => openTipModal()}>
                Tip
              </button>
              <dialog id="tip_modal" className="modal">
                <div className="modal-box">
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
                    className="btn btn-primary"
                    onClick={async () => {
                      const receiver = await handleSearchFromEVMtoRelay(pubKeyReceiver);
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
              <dialog id="relay_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mb-4">RELAY</h1>
                  {/* <label className="block mb-4">
					<select
					  className="select select-bordered w-full mb-2 my-2"
					  value={relayURL}
					  onChange={e => setRelayURL(String(e.target.value))}
					>
					  {relayList.map(relay => (
						<option key={relay} value={relay}>
						  {relay}
						</option>
					  ))}
					</select>
				  </label> */}
                  {/* <button
					className=" w-full  btn btn-primary mb-5"
					onClick={() => {
					  const relay_modal = document.getElementById("relay_modal") as HTMLDialogElement;
					  if (relay_modal) relay_modal;

					  handleConnectRelay();
					}}
				  >
					Connect Relays
				  </button> */}
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
              <button
                className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                onClick={() => {
                  const profile_modal = document.getElementById("Update_profile_modal") as HTMLDialogElement;
                  if (profile_modal) profile_modal.showModal();
                }}
              >
                profile
              </button>
              <dialog id="Update_profile_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mt-10">UPDATE PROFILE</h1>
                  <div className="min-w-full">
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.name}
                      onChange={e => updateMetadata("name", e.target.value)}
                      placeholder="UserName"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.display_name}
                      onChange={e => updateMetadata("display_name", e.target.value)}
                      placeholder="Display Name"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.website}
                      onChange={e => updateMetadata("website", e.target.value)}
                      placeholder="WebSite"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.about}
                      onChange={e => updateMetadata("about", e.target.value)}
                      placeholder="About Me"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.picture}
                      onChange={e => updateMetadata("picture", e.target.value)}
                      placeholder="Picture Link"
                    />
                    {
                      <input
                        className="input input-bordered w-full mb-2"
                        type="text"
                        value={metadata.image}
                        onChange={e => updateMetadata("image", e.target.value)}
                        placeholder="Image Link"
                      />
                    }
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.banner}
                      onChange={e => updateMetadata("banner", e.target.value)}
                      placeholder="Banner Link"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.nip05}
                      onChange={e => updateMetadata("nip05", e.target.value)}
                      placeholder="NIP05"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.lud06}
                      onChange={e => updateMetadata("lud06", e.target.value)}
                      placeholder="LUD06"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.lid16}
                      onChange={e => updateMetadata("lid16", e.target.value)}
                      placeholder="LUD16"
                    />
                    <input
                      className="input input-bordered w-full mb-2"
                      type="text"
                      value={metadata.mastodonUrl}
                      onChange={e => updateMetadata("mastodonUrl", e.target.value)}
                      placeholder="Mastodon URL"
                    />
                    <button
                      className="w-full  btn btn-primary my-5"
                      onClick={() => {
                        const close_modal = document.getElementById("Update_profile_modal") as HTMLDialogElement;
                        if (close_modal) close_modal.close();

                        handleChangeMetadata();
                      }}
                    >
                      Update
                    </button>
                  </div>
                  <div className="modal-action">
                    <form method="dialog">
                      {/* if there is a button in form, it will close the modal */}
                      <button className="btn">Close</button>
                    </form>
                  </div>
                </div>
              </dialog>
            </nav>
            {event && event.created && (
              <div className="bg-success p-5 text-black rounded-md mb-4">
                <h2 className="text-2xl mb-2">🎉 Posted!</h2>
                {/* <p className="mb-2">ID: {event.created.id}</p>
				<p className="mb-2">From: {event.created.pubkey}</p> */}
                <p className="mb-2 text-lg font-medium">{event.created.content}</p>
              </div>
            )}
            <div>
              {pubKeyEthAddressList && (
                <div className="bg-base-100  text-base-content rounded-md mb-4 p-10 break-all">
                  <h2 className="text-2xl mb-5">🎉 PubKey and EVM Address</h2>
                  <ul className="list-disc">
                    {pubKeyEthAddressList.map((item: any) => (
                      <li key={item} className="text-lg font-medium">
                        <span className="font-bold text-primary">
                          <Link href={`https://njump.me/${item.npub}`} target="_blank">
                            {" "}
                            {item.npub}
                          </Link>
                        </span>{" "}
                        :{" "}
                        <button
                          className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                          onClick={() => {
                            openTipModal(), setPubKeyReceiver(item.pubkey);
                          }}
                        >
                          {item.evmAddress}{" "}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="font-black m-5">Connect your wallet</div>
        )}
      </div>
    </div>
  );
};

export default Login;
