"use strict";

import React, { useState } from "react";
import MecenateHelper from "@scobru/crypto-ipfs";
import Mogu from "@scobru/mogu";
import { Nostr3 } from "@scobru/nostr3/dist/Nostr3";
import type { NextPage } from "next";
import { finishEvent, getPublicKey, relayInit } from "nostr-tools";
import { toBytes } from "viem";
import { toHex } from "viem";
import { keccak256 } from "viem";
import viem from "viem";
import { toRlp } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { vechain } from "viem/chains";
import { usePublicClient, useWalletClient } from "wagmi";
import "websocket-polyfill";

const Nostr: NextPage = () => {
  const { data: signer } = useWalletClient();
  const provider = usePublicClient();
  const [privateKey, setPrivateKey] = useState("");
  const [nostrPrivateKey, setNostrPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [nostrPublicKey, setNostrPublicKey] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [relayURL, setRelayURL] = useState("wss://relay.damus.io"); // Replace with a real relay URL
  const [relay, setRelay] = useState<any>(null);
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

  const [connected, setConnected] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [mentionsPublicKeys, setMentionsPublicKeys] = useState<string[]>([]);
  const [mentionsEvents, setMentionsEvents] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [accountEvmToSearch, setAccountEvmToSearch] = useState("");
  const [searchPublicKey, setSearchPublicKey] = useState("");

  const EventsModal = () => (
    <div className={`modal ${isModalOpen ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Fetched Events</h3>
        {event && (
          <div>
            <h2 className="text-2xl mb-2">All Retrieved Events</h2>
            {event.all &&
              event.all.map((e, index) => (
                <div key={index} className="mb-2">
                  <p className="font-bold">{e.id}</p>
                  <p className="font-base">{e.pubKey}</p>
                  <p className="font-light">{e.content}</p>
                </div>
              ))}
          </div>
        )}
      </div>
      <div className="modal-action">
        <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );

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

    console.log("p", resultJson);

    const result = JSON.parse(JSON.stringify(parsedResult[0].content));
    setSearchPublicKey(JSON.parse(result).pubKey);
  };

  const handleSendMessage = async () => {
    const messageEvent = {
      kind: 1, // Kind for a text message
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: newMessage,
      pubkey: publicKey,
    };

    tags.forEach(pk => {
      messageEvent.tags.push(["t", pk]);
    });

    // Add public key mentions
    mentionsPublicKeys.forEach(pk => {
      messageEvent.tags.push(["p", pk]);
    });

    // Add event ID mentions
    mentionsEvents.forEach(eventId => {
      messageEvent.tags.push(["e", eventId]);
    });

    console.log(messageEvent);

    const signedEvent = finishEvent(messageEvent, privateKey);
    await relay.publish(signedEvent);
    setNewMessage(""); // Reset the input field after sending

    // Retrieve events from the relay
    const events = await relay.list([{ kinds: [1] }]);

    console.log(signedEvent);

    // Set state with the latest event and all retrieved events
    setEvent({ created: signedEvent, all: events });

    // relay.close(); (if needed)
  };

  const handleFetchEvents = async () => {
    console.log("Retrieving events from the relay");
    const events = await relay.list([{ kinds: [1] }]);
    console.log("Retrieved events", events);

    setEvent({ all: events });

    setIsModalOpen(true);
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

    console.log("nostrKeys:", nostrKeys);
    console.log("response:", response);
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

    setConnected(true);
  };

  const generateKeyPairFromSeed = async () => {
    const baseMessage = "nostr3";

    // Get 65 byte signature from user using personal_sign
    const formattedMessage = toHex(toBytes(baseMessage));

    console.log(formattedMessage);

    const signature = await signer?.signMessage({ message: formattedMessage });
    console.log("Sig:", signature);
    const hashed = keccak256(signature as any);
    const seed = toBytes(hashed);

    const kp = MecenateHelper.crypto.asymmetric.generateKeyPairFromSeed(seed);
    console.log(kp);

    console.log(privateKeyToAccount(toRlp(kp.secretKey)));

    return kp;
  };

  const updateMetadata = (key: string, value: string) => {
    setMetadata({ ...metadata, [key]: value });
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      {signer?.account ? (
        <div className="font-black m-5">
          <h1 className="text-8xl mb-4">nosrt3</h1>
          <hr className="mb-4" />
          <div className="mb-4 space-y-2">
            <button className="text-xl h-16 btn btn-primary my-5" onClick={async () => await handleGenerateKeys()}>
              Generate Keys
            </button>
            <div>
              {publicKey && (
                <p className="mb-4 ">
                  <strong>Public Key:</strong> {publicKey}
                </p>
              )}
              {privateKey && (
                <p className="mb-4">
                  <strong>Private Key:</strong> {privateKey}
                </p>
              )}
              {nostrPublicKey && (
                <p className="mb-4">
                  <strong>NIP19 Public Key:</strong> {nostrPublicKey}
                </p>
              )}
              {nostrPrivateKey && (
                <p className="mb-4">
                  <strong>NIP19 Private Key:</strong> {nostrPrivateKey}
                </p>
              )}
            </div>
            <br />
            <label className="block mb-4">
              Relay URL:
              <input
                className="input input-bordered w-full my-2"
                type="text"
                value={relayURL}
                onChange={e => setRelayURL(e.target.value)}
                placeholder="Enter Relay URL"
              />
            </label>
            <br />
            <button className="text-xl h-16 btn btn-primary my-5" onClick={handleConnectRelay}>
              Connect to Relay
            </button>
            {connected && <p className="mb-4 text-bold text-success">📡Connected</p>}
            <br />

            <button className="text-xl h-16 btn btn-primary my-5" disabled={!connected} onClick={handleFetchEvents}>
              Fetch Events
            </button>
            <br />
            <br />
            <input
              placeholder="Address to search"
              type="text"
              className="input input-primary"
              onChange={e => setAccountEvmToSearch(e.target.value)}
            />
            <br />

            <button className="text-xl h-16 btn btn-primary my-5" onClick={handleSearchFromEVM}>
              Search Nostr PubKey
            </button>
            <div className="text-bold ">{searchPublicKey}</div>
          </div>

          <div className="divider"></div>
          <h2 className="text-2xl mb-2">Post Message</h2>
          <input
            className="input input-bordered w-full"
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Enter your message"
          />
          <input
            className="input input-bordered w-full"
            type="text"
            placeholder="Enter tags (comma-separated)"
            onChange={e => handleAddTag(e.target.value)}
          />
          <input
            className="input input-bordered w-full"
            type="text"
            placeholder="Enter Event  (comma-separated)"
            onChange={e => handleAddMentionEvent(e.target.value)}
          />
          <input
            className="input input-bordered w-full"
            type="text"
            placeholder="Enter Public Keys (comma-separated)"
            onChange={e => handleAddMentionPublicKey(e.target.value)}
          />
          <button
            className="text-xl h-16 btn btn-primary my-5"
            onClick={handleSendMessage}
            disabled={!connected || !nostrPrivateKey}
          >
            Send Message
          </button>
          <div className="divider"></div>
          <h2 className="text-2xl mb-2">Update Profile</h2>
          <div>
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.name}
              onChange={e => updateMetadata("name", e.target.value)}
              placeholder="UserName"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.display_name}
              onChange={e => updateMetadata("display_name", e.target.value)}
              placeholder="Display Name"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.website}
              onChange={e => updateMetadata("website", e.target.value)}
              placeholder="WebSite"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.about}
              onChange={e => updateMetadata("about", e.target.value)}
              placeholder="About Me"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.picture}
              onChange={e => updateMetadata("picture", e.target.value)}
              placeholder="Picture Link"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.image}
              onChange={e => updateMetadata("image", e.target.value)}
              placeholder="Image Link"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.banner}
              onChange={e => updateMetadata("banner", e.target.value)}
              placeholder="Banner Link"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.nip05}
              onChange={e => updateMetadata("nip05", e.target.value)}
              placeholder="NIP05"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.lud06}
              onChange={e => updateMetadata("lud06", e.target.value)}
              placeholder="LUD06"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.lid16}
              onChange={e => updateMetadata("lid16", e.target.value)}
              placeholder="LUD16"
            />
            <input
              className="input input-bordered w-full"
              type="text"
              value={metadata.mastodonUrl}
              onChange={e => updateMetadata("mastodonUrl", e.target.value)}
              placeholder="Mastodon URL"
            />
            <button className="text-xl h-16 btn btn-primary my-5" onClick={handleChangeMetadata}>
              Change Metadata
            </button>
          </div>
          {event && event.created && (
            <div className="bg-success text-black">
              <h2 className="text-2xl mb-2">Created Event</h2>
              <p className="mb-2">
                ID: <strong>{event.created.id}</strong>
              </p>
              <p className="mb-2">PubKey: {event.created.pubkey}</p>
              <p className="mb-2">Content: {event.created.content}</p>
            </div>
          )}
          {pastEvents && (
            <div>
              <h2 className="text-2xl mb-2">Past Events</h2>
              {pastEvents.map((e, index) => (
                <div key={index} className="mb-2">
                  <p className="font-bold">{e.id}</p>
                  <p className="font-base">{e.pubKey}</p>
                  <p className="font-light">{e.content}</p>
                </div>
              ))}
            </div>
          )}
          <EventsModal />
        </div>
      ) : (
        <div className="font-black m-5">Connect your wallet</div>
      )}
    </div>
  );
};

export default Nostr;
