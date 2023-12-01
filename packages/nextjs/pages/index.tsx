import React, { useEffect, useState } from "react";
import Link from "next/link";
import MecenateHelper from "@scobru/crypto-ipfs";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import type { NextPage } from "next";
import { finishEvent, getPublicKey, relayInit } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import { createWalletClient, http, parseEther, toBytes } from "viem";
import { toHex } from "viem";
import { keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { useWalletClient } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { data: signer } = useWalletClient();
  const [privateKey, setPrivateKey] = useState("");
  const [nostrPrivateKey, setNostrPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [nostrPublicKey, setNostrPublicKey] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [relayURL, setRelayURL] = useState("wss://nostr-bouncer.scobrudot.dev"); // Replace with a real relay URL
  const [relay, setRelay] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pastEvents");
  const [showKeys, setShowKeys] = useState(false);
  // const [relayList, setRelayList] = useState([]);
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
  const [profiles, setProfiles] = useState([
    {
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
    },
  ]);
  const [profilesEncrypted, setProfilesEncrypted] = useState([
    {
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
    },
  ]);
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
  const [tagToFind, setTagToFind] = useState(""); // Replace with a real tag to find [bitcoin
  const [mentionsPublicKeys, setMentionsPublicKeys] = useState<string[]>([]);
  const [mentionsEvents, setMentionsEvents] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [encryptedEvents, setEncryptedEvents] = useState<any[]>([]);
  const [accountEvmToSearch, setAccountEvmToSearch] = useState("");
  const [nProfile, setNProfile] = useState("");
  const [searchPublicKey, setSearchPublicKey] = useState({
    pubkey: "",
    profile: "",
  });
  const [nostr3, setNostr3] = useState<any>(null);
  const [pubKeyReceiver, setPubKeyReceiver] = useState("");
  const [evmAddressReceiver, setEvmAddressReceiver] = useState("");
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

  const TabContent = () => {
    switch (activeTab) {
      case "pastEvents":
        return (
          <div>
            {pastEvents && (
              <div className="overflow-auto">
                {pastEvents
                  .sort((a, b) => b.created_at - a.created_at)
                  .map((e, index) => (
                    <div key={index} className="mb-2 bg-base-100 shadow-md rounded-lg px-2 py-auto">
                      <p className="font-light text-sm text-gray-400">id: {e.id}</p>
                      <p className="font-semibold ">{e.content}</p>{" "}
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      case "fetchEvents":
        return (
          <div className="mt-2">
            {event &&
              [...event.all] // Create a shallow copy to avoid mutating the original array
                .map((e, index) => (
                  <div key={index} className="bg-base-100 p-5 text-base-content break-all mb-10 rounded-xl gap-5">
                    <div className="w-3/4 mx-auto">
                      {profiles[index] ? (
                        <div className="p-3 w-full flex flex-col items-center text-center">
                          {profiles[index].picture && (
                            <LazyLoadImage
                              className="rounded-full w-24"
                              src={profiles[index].picture}
                              effect="blur"
                              placeholderSrc="path_to_placeholder_image.jpg"
                            />
                          )}{" "}
                          <p className="font-bold text-lg mb-2">{profiles[index].display_name}</p>
                        </div>
                      ) : (
                        <div className="p-4 flex flex-col items-center text-center">
                          {" "}
                          <BlockieAvatar address={e.pubkey} size={100} />
                        </div>
                      )}
                      <p className="font-medium text-base">{e.content}</p>
                      {extractAndEmitImages(e.content).map(
                        (
                          imageElement:
                            | string
                            | number
                            | boolean
                            | React.ReactElement<any, string | React.JSXElementConstructor<any>>
                            | React.ReactFragment
                            | React.ReactPortal
                            | null
                            | undefined,
                          imgIndex: React.Key | null | undefined,
                        ) => (
                          <div key={imgIndex}>{imageElement}</div>
                        ),
                      )}
                      <p className="font-bold text-sm">{e.pubkey}</p>
                      <p className="font-semibold text-xs">{new Date(e.created_at * 1000).toLocaleString()}</p>{" "}
                      <button
                        className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                        onClick={() => {
                          openTipModal(), setPubKeyReceiver(e.pubkey);
                        }}
                      >
                        Tip
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        );
      case "encryptedEvents":
        return (
          <div>
            {encryptedEvents &&
              encryptedEvents
                .filter((e: any) => e.pubkey !== publicKey)
                .map((e: any, index: number) => (
                  <div key={index} className="border-secondary border-2 break-all mb-4 rounded-lg p-5">
                    <div className="w-3/4 mx-auto">
                      {profilesEncrypted[index] && (
                        <div className="p-4 flex flex-col items-center text-center">
                          <LazyLoadImage
                            className="rounded-full w-24"
                            src={profilesEncrypted[index].picture}
                            effect="blur"
                            placeholderSrc="path_to_placeholder_image.jpg"
                          />

                          <p className="font-bold text-lg mb-2">{profilesEncrypted[index].display_name}</p>
                        </div>
                      )}
                      <p className="font-medium text-base">{e.content}</p>
                      <p className="font-semibold text-xs">{new Date(e.created_at * 1000).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
          </div>
        );
      case "encryptedNotesEvents":
        return (
          <div>
            {encryptedEvents &&
              encryptedEvents
                .filter((e: any) => e.pubkey === publicKey)
                .map((e: any, index: number) => (
                  <div key={index} className="border-secondary border-2 break-all mb-4 rounded-lg p-5">
                    <div className="w-3/4 mx-auto">
                      {profilesEncrypted[index] && (
                        <div className="p-4 flex flex-col items-center text-center">
                          <LazyLoadImage
                            className="rounded-full h-24 w-24 object-cover mb-4"
                            src={profilesEncrypted[index].picture}
                            alt="Profile"
                          />
                          <p className="font-bold text-lg mb-2">{profilesEncrypted[index].display_name}</p>
                          <button onClick={() => deleteEvent(e.id)} className="btn btn-ghost ">
                            delete
                          </button>
                        </div>
                      )}
                      <p className="font-medium text-base">{e.content}</p>
                      <p className="font-semibold text-xs">{new Date(e.created_at * 1000).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
          </div>
        );

      default:
        return null;
    }
  };
  //////////////////////////////////////////////////////////////////////////////////////
  // load Profile //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////////////////////////////////////
  // Tipping ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  const handleTip = async (receiver: any) => {
    const tx = await signer?.sendTransaction({
      to: receiver,
      value: parseEther(String(amountToTip)),
    });
    console.log("tx: ", tx);
    notification.success("Tip sent");
    const tip_modal = document.getElementById("tip_modal") as HTMLDialogElement;
    if (tip_modal) {
      tip_modal.close();
    }
  };

  //////////////////////////////////////////////////////////////////////////////////////
  // Message ///////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  const handleDirectMessage = async () => {
    const ciphertext = await nostr3.encryptDM(newMessage, pubKeyReceiver);
    console.log("ciphertext: ", ciphertext);

    const messageEvent = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", pubKeyReceiver]],
      content: ciphertext,
      pubkey: publicKey,
    };

    console.log("messageEvent: ", messageEvent);

    const signedEvent = finishEvent(messageEvent, privateKey);
    await relay.publish(signedEvent);

    setNewMessage(""); // Reset the input field after sending

    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [1] }]);

    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });

    // relay.close(); (if needed)
  };

  const decryptDirectMessage = async (content: any, pubkey: any) => {
    const decrypted = await nostr3.decryptDM(content, pubkey);
    return decrypted;
  };

  const handleSendMessage = async () => {
    const tags = extractHashtags(newMessage);
    const messageEvent: any = {
      kind: 1, // Kind for a text message
      created_at: Math.floor(Date.now() / 1000),
      tags: [tags],
      content: newMessage,
      pubkey: publicKey,
    };

    // Hashtags

    messageEvent.tags.push(extractHashtags(newMessage));

    // PublicKey
    mentionsPublicKeys.forEach(pk => {
      messageEvent.tags.push(["p", pk]);
    });

    // Events
    mentionsEvents.forEach(eventId => {
      messageEvent.tags.push(["e", String(eventId)]);
    });

    const signedEvent = finishEvent(messageEvent, privateKey);
    await relay.publish(signedEvent);
    setNewMessage(""); // Reset the input field after sending

    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [1] }]);

    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });

    // relay.close(); (if needed)
  };

  const deleteEvent = async (event_id: string) => {
    try {
      // if (!nostrExtensionLoaded()) {
      //   throw "Nostr extension not loaded or available"
      // }

      const msg = {
        id: "", // Event Id
        kind: 5, // NIP-X - Deletion
        content: "", // Deletion Reason
        tags: [] as Array<[string, string]>,
        created_at: 0,
        pubkey: "",
      };

      msg.tags.push(["e", event_id]);

      console.log(msg);

      // set msg fields
      msg.created_at = Math.floor(new Date().getTime() / 1000);
      msg.pubkey = publicKey;

      // Sign event
      const signedEvent = finishEvent(msg, privateKey);
      await relay.publish(signedEvent);
    } catch (e) {
      console.log("Failed to sign message with browser extension", e);
      return false;
    }
  };

  const handleAddMentionEvent = (eventId: string) => {
    setMentionsEvents([...mentionsEvents, eventId]);
  };

  const handleAddMentionPublicKey = (publicKey: string) => {
    setMentionsPublicKeys([...mentionsPublicKeys, publicKey]);
  };

  //////////////////////////////////////////////////////////////////////////////////////
  // Search ////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  // const handleSearchFromEVMIPFS = async accountEvm => {
  //   const url = `/api/store?evmAddress=${accountEvm}`;

  //   // Esegui la richiesta fetch
  //   const verifiedResult = await fetch(url, {
  //     method: "GET",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //   });

  //   console.log("verifiedResult: ", verifiedResult);

  //   // Converti la risposta in JSON
  //   const resultJson = await verifiedResult.json();
  //   const parsedResult = JSON.parse(resultJson.data);
  //   const result = JSON.parse(JSON.stringify(parsedResult[0].content));
  //   const profile = await loadEvmProfile(JSON.parse(result).pubKey);
  //   setSearchPublicKey({ pubkey: JSON.parse(result).pubKey, profile: JSON.stringify(profile) });
  //   return JSON.parse(result).pubKey;
  // };

  // const handleSearchFromPubkeyIPFS = async (pubkey: any) => {
  //   try {
  //     const url = `/api/get?pubkey=${pubkey}`;

  //     // Esegui la richiesta fetch
  //     const verifiedResult = await fetch(url, {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     // Verifica se la richiesta ha avuto successo
  //     if (!verifiedResult.ok) {
  //       throw new Error(`HTTP error! Status: ${verifiedResult.status}`);
  //     }

  //     // Converti la risposta in JSON
  //     const resultJson = await verifiedResult.json();

  //     // Assicurati che i dati siano presenti nella risposta
  //     if (!resultJson.data) {
  //       throw new Error("No data found in the response");
  //     }

  //     const parsedResult = JSON.parse(resultJson.data);
  //     const result = JSON.parse(JSON.stringify(parsedResult[0].name));
  //     return result;
  //   } catch (error) {
  //     notification.error("Profile not registered");
  //     console.error("Errore durante la ricerca della chiave pubblica:", error);
  //     // Gestisci l'errore come preferisci, ad esempio mostrando un messaggio all'utente
  //     // Potresti anche impostare uno stato per mostrare un messaggio di errore nell'interfaccia utente
  //   }
  // };

  const handleSearchFromEVMtoRelay = async (pubKey: string) => {
    const events = await relay.list([{ kinds: [30078], authors: [pubKey] }]);
    console.log("events: ", events);
    if (events.length === 0) return null;
    setEvmAddressReceiver(events[0].content);

    return events[0].content;
  };
  interface Event {
    content: string;
    pubkey: string;
  }

  const handleListAllPubkeyAndEthAddress = async () => {
    const events = await relay.list([{ kinds: [30078] }]);
    //if (events.length === 0) return null;

    const eventResult: { pubkey: string; npub: string; evmAddress: string }[] = [];
    // create a paggin with event.content and event.pubkey
    events.map((event: Event) => {
      // only event.content start with 0x
      if (event.content.slice(0, 2) !== "0x") return null;
      eventResult.push({ pubkey: event.pubkey, npub: nip19.npubEncode(event.pubkey), evmAddress: event.content });
    });

    console.log("eventFilterd: ", eventResult);
    setPubKeyEthAddressList(eventResult);
    return eventResult;
  };

  //   const handleSearchFromPubkey = async (pubKey: string) => {
  //     const pkHex_a = "0x02" + pubKey;
  //     const pkHex_b = "0x03" + pubKey;

  //     const addr_a = ethers.computeAddress(pkHex_a);
  //     const addr_b = ethers.computeAddress(pkHex_b);

  //     console.log(addr_a);
  //     console.log(addr_b);

  //     let pub_a;
  //     let pub_b;

  //     try {
  //       pub_a = await handleSearchFromPubkeytoRelay(addr_a);
  //       console.log(String(pub_a));
  //       if (String(pub_a) == pubKey) {
  //         console.log(addr_a);
  //         setEvmAddressReceiver(addr_a);
  //         return addr_a;
  //       }
  //     } catch (error) {
  //       console.log(error);
  //     }

  //     try {
  //       pub_b = await handleSearchFromPubkeytoRelay(addr_b);
  //       console.log(pub_b);
  //       if (String(pub_b) == pubKey) {
  //         console.log(addr_b);
  //         setEvmAddressReceiver(addr_b);
  //         return addr_b;
  //       }
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };

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

  //////////////////////////////////////////////////////////////////////////////////////
  // Events ////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  const handleConnectExtension = async () => {
    const _pubKey = await window?.nostr?.getPublicKey();
    setIsExtension(true);
    setPublicKey(_pubKey);
    setNostrPublicKey(nip19.npubEncode(_pubKey));
    setNProfile(nip19.nprofileEncode({ pubkey: _pubKey }));
    setPrivateKey("");
    setNostrPrivateKey("");
    setEvmAddress("");
    setWallet("");
  };

  const reload = async () => {
    await handleFetchEvents();
    await handleFetchMyEvents();
    await handleEncryptedEvents();
    await handleListAllPubkeyAndEthAddress();
  };

  const handleFetchEvents = async () => {
    const _events = await relay.list([{ kinds: [1], limit: 50 }]);
    // sort event by date recent
    const _eventsSort = _events.sort(
      (a: { created_at: number }, b: { created_at: number }) => b.created_at - a.created_at,
    );

    if (!tagToFind) {
      setEvent({ all: _eventsSort });
      const _loadedProfiles = await Promise.all(_eventsSort.map((e: { pubkey: any }) => loadProfile(e.pubkey)));
      setProfiles(_loadedProfiles);
      //setIsModalOpen(true);
      return;
    }
    // filter events when hashtag is "bitcoin"
    const filterEvents = _eventsSort.filter((event: any) => {
      return event.tags.some((tag: any) => tag.length === 2 && tag[0] === "t" && tag[1] === tagToFind);
    });
    setEvent({ all: filterEvents });
    const _loadedProfiles = await Promise.all(filterEvents.map((e: { pubkey: any }) => loadProfile(e.pubkey)));
    setProfiles(_loadedProfiles);
  };

  const handleFetchMyEvents = async () => {
    const events = await relay.list([{ kinds: [1], authors: [publicKey] }]);
    setPastEvents(events);
  };

  const handleEncryptedEvents = async () => {
    let events = await relay.list([{ kinds: [4] }]);
    // check inside the tag [p, publicKey]
    events = events.filter((event: any) => {
      return event.tags.some((tag: any) => tag.length === 2 && tag[0] === "p" && tag[1] === publicKey);
    });
    // decrypt the event.content and subsistute the event.content with the decrypted message
    events.forEach(async (event: any) => {
      event.content = await decryptDirectMessage(event.content, event.pubkey);
    });
    setEncryptedEvents(events);
    const _loadedProfiles = await Promise.all(events.map((e: { pubkey: any }) => loadProfile(e.pubkey)));
    Promise.all(_loadedProfiles);
    if (_loadedProfiles) setProfilesEncrypted(_loadedProfiles as any[]);
  };

  //////////////////////////////////////////////////////////////////////////////////////
  // Use Effect ////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    if (connected && pastEvents.length === 0) {
      const run = async () => {
        try {
          const profileData = await loadProfile(publicKey);
          setProfileDetails(profileData);
          await handleListAllPubkeyAndEthAddress();
        } catch (error) {
          notification.error("Error loading profile");
        }
      };
      run();
    }
  }, [connected, nostrKeys]);

  useEffect(() => {
    if (relay && relay.status == 3) {
      setConnected(false);
    } else if (relay && relay.status == 1) {
      setConnected(true);
    }
    console.log("Relay", relay);
  }, [relay]);

  useEffect(() => {
    handleConnectRelay();
  }, []);

  // Utils
  const extractHashtags = (str: string) => {
    const regex = /#(\w+)/g;
    let matches;
    const hashtags = [];

    while ((matches = regex.exec(str)) !== null) {
      if (matches.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      hashtags.push(matches[1]); // Pushing the captured group, excluding the '#' symbol
    }

    // Return the hashtags array in the desired format
    return ["t", ...hashtags];
  };

  const extractAndEmitImages = (text: string) => {
    const pattern = /https?:\/\/\S+\.jpg/g;
    const urls = text.match(pattern);
    // eslint-disable-next-line react/jsx-key
    return urls ? urls.map((url: string | undefined) => <LazyLoadImage src={url} alt="Image" className="my-2" />) : [];
  };

  const generateKeyPairFromSeed = async () => {
    const baseMessage = "nostr3";
    const formattedMessage = toHex(toBytes(baseMessage));
    const signature = await signer?.signMessage({ message: formattedMessage });
    const hashed = keccak256(signature as any);
    const seed = toBytes(hashed);
    const kp = MecenateHelper.crypto.asymmetric.generateKeyPairFromSeed(seed);
    return kp;
  };

  const handleSignIn = async () => {
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
  };

  const handleGenerateKeys = async () => {
    //const sk = generatePrivateKey();

    const kp = await generateKeyPairFromSeed();
    const pkSlice = toHex(kp.secretKey).slice(2).slice(64);
    const nostr3 = new Nostr3(pkSlice);
    const nostrKeys = nostr3.generateNostrKeys();
    setNostrPrivateKey(nostrKeys.nsec);
    setPrivateKey(nostrKeys.sec);
    setPublicKey(getPublicKey(nostrKeys.sec));
    setNostrPublicKey(nostrKeys.npub);
    setNProfile(nostrKeys.nprofile);
    setNostr3(nostr3);

    setNostrKeys(nostrKeys);

    const pkHex = "0x" + nostrKeys.sec;

    const newWallet = createWalletClient({
      account: privateKeyToAccount(pkHex as any),
      chain: optimism,
      transport: http(),
    });

    setWallet(newWallet);
    setEvmAddress(await newWallet?.account?.address);
    console.log(nostrKeys);

    try {
      const profileData = await loadProfile(nostrKeys.pub);
      setProfileDetails(profileData);
    } catch (error) {
      notification.error("Error loading profile");
    }
  };

  const ProfileDetailsBox = () => {
    return (
      <div className="profile-details-box bg-base rounded-ms  p-5 my-10 flex flex-col items-center text-center w-3/8">
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
        <input
          type="text"
          className="input input-primary my-4"
          id="EvmAddress"
          placeholder="Set Evm address"
          value={evmAddress}
          onChange={e => setEvmAddress(e.target.value)}
        />
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
        <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6 mt-5" onClick={handleSignIn}>
          Sign in
        </label>
      </div>
    );
  };

  //////////////////////////////////////////////////////////////////////////////////////
  // Relay /////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////////////////////////////////////
  // Update Profile ////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  const updateMetadata = (key: string, value: string) => {
    setMetadata({ ...metadata, [key]: value });
  };

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
    // Publish the signed event
    await relay.publish(signedEvent);
    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [1] }]);
    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });

    //relay.close();
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10 ">
      <div className="w-full">
        {signer?.account ? (
          <div className="m-5  mx-auto w-5/6">
            <h1 className="text-7xl mb-10 font-semibold">NOSTR3</h1>
            <h1 className="text-xl mb-5">generate programmatically key for nostr protocol with your web3 address</h1>
            <p className="text-base justify-start">
              {" "}
              <strong> Nostr3 </strong>
              is here to make your life easier when dealing with the Nostr protocol! It cleverly generates private keys
              right from your EVM address, taking the hassle out of key storage. Need your keys? Just a quick
              interaction with Nostr3, and you are all set. What&apos;s more, it links your Nostr accounts to your EVM
              accounts, making tipping a breeze for all Nostr accounts set up through Nostr3. While Nostr3 isn&apos;t a
              full-fledged Nostr protocol client, it&apos;s a super handy tool that covers the basics. But hey, for the
              best Nostr experience, we suggest pairing it with open-source clients. Happy Nostring!
            </p>

            <div className="my-2 break-all bg-base-100 p-2">
              <pre>
                <p>
                  NOSTR3 CUSTOM EVENT
                  <br />
                  <p className="break-all">
                    This is the event emitted by nostr3
                    <br /> when you link your evm account
                    <br />
                    with your nostr pubkey.
                  </p>
                </p>
                {"const messageEvent: any = {"} <br />
                {"  kind: 30078,"}
                <br />
                {"  created_at: Date.now(),"}
                <br />
                {'  tags: [["d", "nostr3"]],'}
                <br />
                {"  content: evmAddress,"}
                <br />
                {"  pubkey: pubkey,"}
                <br />
                {"};"}
                <br />
              </pre>
            </div>
            <div className="bg-success  text-success-content rounded-md mb-4 p-10">
              <h2 className="text-2xl mb-5 ">🎉 Updates</h2>
              <ul className="list-disc">
                <li className="text-lg font-medium ">
                  <span className="font-bold ">Nos2x extension</span> : Login with nos2x extension
                </li>
                <li className="text-lg font-medium ">
                  <span className="font-bold ">List Address Box</span> : Added a box to list all pubkey associated with
                  the corrispodent evm address.
                </li>
              </ul>
            </div>
            <nav className="flex flex-wrap p-4 text-center mx-auto w-auto">
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleGenerateKeys}>
                Generate Keypair
              </label>
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={handleConnectExtension}>
                Login With extension
              </label>
            </nav>
            {connected ? (
              <p className="mb-4 text-bold text-xl text-success">📡 Connected</p>
            ) : (
              <p className="mb-4 text-bold text-xl text-success">Not Connected</p>
            )}
            <ProfileDetailsBox />
            <nav className="flex flex-wrap p-4">
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
                        notification.error("Profile not registered");
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
                      setRelayURL("wss://nostr-bouncer.scobrudot.dev");
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
                  const direct_modal = document?.getElementById("direct_modal") as HTMLDialogElement;
                  direct_modal?.showModal();
                }}
              >
                DM
              </button>
              <dialog id="direct_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mt-10">DIRECT MESSAGE</h1>
                  <textarea
                    className="textarea textarea-primary w-full mb-4 mt-5"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Enter your message"
                  />
                  <input
                    className="input input-bordered w-full mb-2"
                    type="text"
                    placeholder="Enter Public Keys"
                    onChange={e => setPubKeyReceiver(e.target.value)}
                  />
                  <button
                    className="btn btn-primary my-5 w-full"
                    onClick={() => {
                      const messageModal = document.getElementById("message_modal") as HTMLDialogElement;
                      if (messageModal) messageModal.close();
                      handleDirectMessage();
                    }}
                    disabled={!connected || !nostrPrivateKey}
                  >
                    Send Message
                  </button>
                  <div className="modal-action">
                    <form method="dialog">
                      {/* if there is a button in form, it will close the modal */}
                      <button className="btn">Close</button>
                    </form>
                  </div>
                </div>
              </dialog>{" "}
              <button
                className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                onClick={() => {
                  const notes_modal = document?.getElementById("notes_modal") as HTMLDialogElement;
                  notes_modal?.showModal();
                }}
              >
                Notes
              </button>
              <dialog id="notes_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mt-10">NOTES</h1>
                  <textarea
                    className="textarea textarea-primary w-full mb-4 mt-5"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Enter your message"
                  />
                  <button
                    className="btn btn-primary my-5 w-full"
                    onClick={async () => {
                      const notes_modal = document.getElementById("notes_modal") as HTMLDialogElement;
                      if (notes_modal) notes_modal.close();
                      setPubKeyReceiver(publicKey);
                      await handleDirectMessage();
                    }}
                    disabled={!connected || !nostrPrivateKey}
                  >
                    Send Message
                  </button>
                  <div className="modal-action">
                    <form method="dialog">
                      {/* if there is a button in form, it will close the modal */}
                      <button className="btn">Close</button>
                    </form>
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
              <button
                className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                onClick={() => {
                  const post_modal = document.getElementById("post_modal") as HTMLDialogElement;
                  if (post_modal) {
                    post_modal.showModal();
                  }
                }}
              >
                Post
              </button>
              <dialog id="post_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mt-10">POST</h1>
                  <textarea
                    className="textarea textarea-primary w-full mb-4 mt-5"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Enter your message"
                  />

                  <input
                    className="input input-bordered w-full mb-2"
                    type="text"
                    placeholder="Enter Event  (comma-separated)"
                    onChange={e => handleAddMentionEvent(e.target.value)}
                  />
                  <input
                    className="input input-bordered w-full mb-2"
                    type="text"
                    placeholder="Enter Public Keys (comma-separated)"
                    onChange={e => handleAddMentionPublicKey(e.target.value)}
                  />
                  <button
                    className="  btn btn-primary my-5 w-full"
                    onClick={() => {
                      const postModal = document.getElementById("post_modal") as HTMLDialogElement;
                      if (postModal) {
                        postModal.close();
                      }
                      handleSendMessage();
                    }}
                    disabled={!connected || !nostrPrivateKey}
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
            </nav>
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
            {event && event.created && (
              <div className="bg-success p-5 text-black rounded-md mb-4">
                <h2 className="text-2xl mb-2">🎉 Posted!</h2>
                {/* <p className="mb-2">ID: {event.created.id}</p>
				<p className="mb-2">From: {event.created.pubkey}</p> */}
                <p className="mb-2 text-lg font-medium">{event.created.content}</p>
              </div>
            )}
            <div>
              <div role="tablist" className="tabs tabs-boxed mb-5">
                <a
                  role="tab"
                  className="tab"
                  onClick={async () => {
                    setActiveTab("encryptedNotesEvents");
                  }}
                >
                  Notes
                </a>
                <a
                  role="tab"
                  className="tab"
                  onClick={async () => {
                    setActiveTab("encryptedEvents");
                  }}
                >
                  Direct Messages
                </a>
                <a
                  role="tab"
                  className="tab"
                  onClick={async () => {
                    setActiveTab("pastEvents");
                  }}
                >
                  Your Post
                </a>
                <a
                  role="tab"
                  className="tab "
                  onClick={async () => {
                    setActiveTab("fetchEvents");
                  }}
                >
                  Feed
                </a>
                <a
                  role="tab"
                  className="tab font-bold"
                  onClick={async () => {
                    await reload();
                  }}
                >
                  Refresh 🔄️
                </a>
                <input
                  placeholder="Leave empty to fetch all events"
                  type="text"
                  className="input input-xs mx-2"
                  onChange={e => setTagToFind(e.target.value)}
                />
                <button className="  btn btn-xs" disabled={!connected} onClick={reload}>
                  Search
                </button>
              </div>
              <TabContent />
              <h3 className=" gap-2 flex flex-row text-lg mb-4">
                <span> Donate to support the project to</span>
                <Address address={"0xb542E27732a390f509fD1FF6844a8386fe320f7f"} /> 🙏
              </h3>
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
