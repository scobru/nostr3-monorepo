import React, { useEffect, useState } from "react";
import MecenateHelper from "@scobru/crypto-ipfs";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import type { NextPage } from "next";
import { finishEvent, getPublicKey, relayInit } from "nostr-tools";
import { toBytes } from "viem";
import { toHex } from "viem";
import { keccak256 } from "viem";
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
  const [relayURL, setRelayURL] = useState("wss://relay.damus.io"); // Replace with a real relay URL
  const [relay, setRelay] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pastEvents");
  const [showKeys, setShowKeys] = useState(false);
  const [relayList, setRelayList] = useState([]);

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
  const [tags, setTags] = useState<string[]>([]);
  const [mentionsPublicKeys, setMentionsPublicKeys] = useState<string[]>([]);
  const [mentionsEvents, setMentionsEvents] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [accountEvmToSearch, setAccountEvmToSearch] = useState("");
  const [nProfile, setNProfile] = useState("");
  const [searchPublicKey, setSearchPublicKey] = useState({
    pubkey: "",
    profile: "",
  });

  const TabContent = () => {
    switch (activeTab) {
      case "pastEvents":
        return (
          <div>
            {pastEvents && (
              <div className="overflow-auto">
                {pastEvents.map((e, index) => (
                  <div key={index} className=" mb-2 bg-base-100  shadow-md rounded-lg px-2 py-auto">
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
          <div>
            {event &&
              event.all &&
              event.all.map((e: any, index: number) => (
                <div key={index} className="border-secondary border-2 break-all mb-4 rounded-lg p-5">
                  <div className="w-3/4 mx-auto">
                    {profiles[index] ? (
                      <div className="p-4 flex flex-col items-center text-center">
                        <img
                          className="rounded-full h-24 w-24 object-cover mb-4"
                          src={profiles[index].picture}
                          alt="Profile"
                          onError={e => (e.currentTarget.src = "logo.svg")}
                        />
                        <p className="font-bold text-lg mb-2">{profiles[index].display_name}</p>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col items-center text-center">
                        {" "}
                        <BlockieAvatar address={e.pubkey} size={100} />
                      </div>
                    )}
                    <p className="font-medium text-base">{e.content}</p>
                    <p className="font-bold text-sm">{e.pubkey}</p>
                    <p className="font-semibold text-xs">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
          </div>
        );
      default:
        return null;
    }
  };

  const loadProfile = async (loadedPubKey: any) => {
    try {
      const result = await relay.list([{ kinds: [0], authors: [loadedPubKey] }]);
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

  const loadEvmProfile = async (loadedPubKey: any) => {
    try {
      const result = await relay.list([{ kinds: [0], authors: [loadedPubKey] }]);
      if (result && result[0] && result[0].content) {
        return JSON.parse(result[0].content);
      } else {
        console.warn("Nessun profilo trovato o dati non validi per la chiave:", loadedPubKey);
        return null; // Restituisci null se non ci sono dati validi
      }
    } catch (error) {
      console.error("Errore nel caricamento del profilo:", error);
      return null; // Gestisci l'errore restituendo null o un valore di default
    }
  };

  const handleSearchFromEVM = async () => {
    const url = `/api/store?evmAddress=${accountEvmToSearch}`;

    // Esegui la richiesta fetch
    const verifiedResult = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Converti la risposta in JSON
    const resultJson = await verifiedResult.json();

    const parsedResult = JSON.parse(resultJson.data);
    const result = JSON.parse(JSON.stringify(parsedResult[0].content));
    const profile = await loadEvmProfile(JSON.parse(result).pubKey);
    setSearchPublicKey({ pubkey: JSON.parse(result).pubKey, profile: JSON.stringify(profile) });
  };

  const handleSendMessage = async () => {
    const messageEvent: any = {
      kind: 1, // Kind for a text message
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: newMessage,
      pubkey: publicKey,
    };

    // Hashtags
    tags.forEach(pk => {
      messageEvent.tags.push(["t", pk]);
    });

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

  const handleFetchEvents = async () => {
    const events = await relay.list([{ kinds: [1] }]);
    if (!tagToFind) {
      setEvent({ all: events });
      //setIsModalOpen(true);
      return;
    }
    // filter events when hashtag is "bitcoin"
    const filterEvents = events.filter((event: any) => {
      return event.tags.some((tag: any) => tag.length === 2 && tag[0] === "t" && tag[1] === tagToFind);
    });
    setEvent({ all: filterEvents });
    //setIsModalOpen(true);
  };
  const handleFetchMyEvents = async () => {
    const events = await relay.list([{ kinds: [1], authors: [publicKey] }]);
    setPastEvents(events);
  };

  useEffect(() => {
    if (connected && pastEvents.length === 0) {
      handleFetchMyEvents();
      const run = async () => {
        try {
          const profileData = await loadProfile(publicKey);
          setProfileDetails(profileData);
        } catch (error) {
          notification.error("Error loading profile");
        }
      };
      run();
    }
  }, [connected]);

  useEffect(() => {
    if (relay && relay.status == 3) {
      setConnected(false);
    }
  }, [relay]);

  useEffect(() => {
    if (event && event.all) {
      const loadProfiles = async () => {
        const _loadedProfiles = await Promise.all(event.all.map((e: { pubkey: any }) => loadProfile(e.pubkey)));
        Promise.all(_loadedProfiles).then(values => {});
        if (_loadedProfiles) setProfiles(_loadedProfiles as any[]);
      };

      loadProfiles();
    }
  }, [event]);

  useEffect(() => {
    const fetchRelays = async () => {
      try {
        const response = await fetch("https://api.nostr.watch/v1/online");
        const data = await response.json();
        setRelayList(data); // Assuming the API returns an array of relays
      } catch (error) {
        console.error("Failed to fetch relay list:", error);
      }
    };

    fetchRelays();
  }, []);

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

  const ProfileDetailsBox = () => {
    return (
      <div className="profile-details-box bg-base rounded-ms  p-5 my-10 flex flex-col items-center text-center w-3/8">
        {profileDetails && profileDetails.display_name && (
          <div>
            <img
              className="rounded-full h-24 w-24 object-cover mb-4"
              src={profileDetails?.picture}
              alt="Profile"
              //onError={e => (e.currentTarget.src = "fallback-image-url.jpg")} // Fallback image
            />
            <h3 className="font-bold text-lg mb-4">{profileDetails.display_name}</h3>
            <p className="text-md">{profileDetails.about}</p>
          </div>
        )}
        <button className="btn text-left mb-5" onClick={() => setShowKeys(!showKeys)}>
          {showKeys ? "Hide Keys" : "Show Keys"}
        </button>
        {showKeys && (
          <div className="w-fit bg-primary text-primary-content rounded-lg p-5 shadow-mg shadow-base-accent">
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
            </ul>
          </div>
        )}
      </div>
    );
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
    try {
      const profileData = await loadProfile(nostrKeys.pub);
      setProfileDetails(profileData);
    } catch (error) {
      notification.error("Error loading profile");
    }
    const response = await fetch("/api/store", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        evmAddress: await signer?.account.address,
        pubKey: nostrKeys.pub,
      }),
    });
  };

  const handleAddTag = (tagString: string) => {
    const newTags = tagString.split(",").map(tag => tag.trim());
    setTags(newTags);
  };

  const handleAddMentionEvent = (eventId: string) => {
    setMentionsEvents([...mentionsEvents, eventId]);
  };

  const handleAddMentionPublicKey = (publicKey: string) => {
    setMentionsPublicKeys([...mentionsPublicKeys, publicKey]);
  };

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
        console.log("Event received:", event);
        setPastEvents([...pastEvents, event]);
      });
      sub.on("eose", () => {
        sub.unsub();
      });
    });
    relay.on("error", () => {
      console.error(`Failed to connect to ${relay.url}`);
    });

    await relay.connect();
    setRelay(relay);
  };

  const generateKeyPairFromSeed = async () => {
    const baseMessage = "nostr3";
    const formattedMessage = toHex(toBytes(baseMessage));

    const signature = await signer?.signMessage({ message: formattedMessage });
    const hashed = keccak256(signature as any);
    const seed = toBytes(hashed);
    const kp = MecenateHelper.crypto.asymmetric.generateKeyPairFromSeed(seed);

    /* const secretKey = bytesToHex(kp.secretKey).slice(64);
    const newWallet = privateKeyToAccount(String(secretKey));
    const newSignature = await newWallet.signMessage({ message: formattedMessage });
    const newHashed = keccak256(newSignature as any);
    const newSeed = toBytes(newHashed);
    const newKp = MecenateHelper.crypto.asymmetric.generateKeyPairFromSeed(newSeed);

    setStealthAddress(newWallet.address); */

    return kp;
  };

  const updateMetadata = (key: string, value: string) => {
    setMetadata({ ...metadata, [key]: value });
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10 ">
      <div className="w-2/4 mx-auto">
        {signer?.account ? (
          <div className="m-5 break-all">
            <h1 className="text-8xl mb-4 font-semibold">NOSTR3</h1>
            <h1 className="text-xl mb-5">generate programmatically key for nostr protocol with your web3 address</h1>
            <nav className="flex flex-wrap p-4">
              <label className="btn btn-ghost mr-2 md:mr-4 lg:mr-6" onClick={async () => await handleGenerateKeys()}>
                Generate Keys
              </label>
              <button
                className="btn btn-ghost mr-2 md:mr-4 lg:mr-6"
                onClick={() => {
                  const relayModal = document?.getElementById("relay_modal") as HTMLDialogElement;
                  relayModal?.showModal();
                  handleConnectRelay();
                }}
              >
                Relay
              </button>
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
                  const profile_modal = document.getElementById("Update_profile_modal") as HTMLDialogElement;
                  if (profile_modal) profile_modal.showModal();
                }}
              >
                update profile
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
                    className="input input-bordered w-full mb-2 mb-2"
                    type="text"
                    placeholder="Enter tags (comma-separated)"
                    onChange={e => handleAddTag(e.target.value)}
                  />
                  <input
                    className="input input-bordered w-full mb-2 mb-2"
                    type="text"
                    placeholder="Enter Event  (comma-separated)"
                    onChange={e => handleAddMentionEvent(e.target.value)}
                  />
                  <input
                    className="input input-bordered w-full mb-2 mb-2"
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
                    Send Message
                  </button>
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
                  const search_evm_modal = document.getElementById("search_evm_modal") as HTMLDialogElement;
                  if (search_evm_modal) {
                    search_evm_modal.showModal();
                  }
                }}
              >
                SEARCH
              </button>
              <dialog id="search_evm_modal" className="modal">
                <div className="modal-box">
                  <h1 className="text-3xl font-thin mt-10">SEARCH ADDRESS</h1>
                  <div className="flex flex-col mt-5">
                    <input
                      placeholder="EVM Address joined to nostr3"
                      type="text"
                      className="input input-primary my-5"
                      onChange={e => setAccountEvmToSearch(e.target.value)}
                    />

                    <button
                      className="  btn btn-primary my-5"
                      disabled={!connected}
                      onClick={() => {
                        handleSearchFromEVM();
                      }}
                    >
                      Search Nostr PubKey
                    </button>
                    <br />
                    {searchPublicKey.pubkey && (
                      <div>
                        <div className="text-sm ">{searchPublicKey.pubkey}</div>
                      </div>
                    )}
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
            {connected ? (
              <p className="mb-4 text-bold text-xl text-success">📡 Connected</p>
            ) : (
              <p className="mb-4 text-bold text-xl text-success">Not Connected</p>
            )}
            <ProfileDetailsBox />
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
                  onClick={() => {
                    setActiveTab("pastEvents");
                    handleFetchMyEvents();
                  }}
                >
                  Your Post
                </a>
                <a
                  role="tab"
                  className="tab "
                  onClick={() => {
                    setActiveTab("fetchEvents");
                    handleFetchEvents();
                  }}
                >
                  Feed
                </a>
                <input
                  placeholder="Leave empty to fetch all events"
                  type="text"
                  className="input input-xs mx-2"
                  onChange={e => setTagToFind(e.target.value)}
                />
                <button className="  btn btn-xs" disabled={!connected} onClick={handleFetchEvents}>
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
