import { useEffect, useState } from "react";
import AuthCard from "../components/client/authCard";
import CreatePostCard from "../components/client/createPostCard";
import CreatedAccModal from "../components/client/createdAccModal";
import DisplayEventCard from "../components/client/displayEventCard";
import EventLoader from "../components/client/eventLoader";
import RelayCtrlCard from "../components/client/relayCtrlCard";
import { RELAYS } from "../utils/constants";
import { NextPage } from "next";
import { Event, Filter, Relay, UnsignedEvent, getEventHash, getPublicKey, relayInit, signEvent } from "nostr-tools";
import { useWalletClient } from "wagmi";
import { useGlobalState } from "~~/services/store/store";

type QuotedEvent = Event & {
  quotedEvent: Event;
};

const Client: NextPage = () => {
  const [showKeysModal, setShowKeysModal] = useState<boolean>(false);
  const [showEventsLoader, setShowEventsLoader] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[] | QuotedEvent[]>([]);
  const [curRelayName, setCurRelayName] = useState<string>("wss://relay.primal.net");
  const [relay, setRelay] = useState<Relay | null>(null);
  const [sk, setSk] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(sk ? getPublicKey(sk) : null);
  const privateKey = useGlobalState(state => state.nostrKeys.sec);
  const { data: signer } = useWalletClient();
  const [ethTipAmount, setEthTipAmount] = useState<string>("");

  useEffect(() => {
    const connectRelay = async () => {
      setShowEventsLoader(true);
      const relay = relayInit(curRelayName);
      await relay.connect();

      relay.on("connect", async () => {
        setRelay(relay);
        const events: Event[] = await relay.list([{ kinds: [1], limit: 100 }]);
        setEvents(events);

        setTimeout(() => {
          setShowEventsLoader(false);
        }, 1000);
      });
      relay.on("error", () => {
        console.log("failed to connect to relay");
      });
    };
    connectRelay();

    if (sk && !isLoggedIn) {
      setPk(getPublicKey(sk));
      setIsLoggedIn(true);
    }
  }, [sk, pk, curRelayName]);

  const createEvent = (unsignedEvent: UnsignedEvent, sk: string): Event => {
    const eventHash = getEventHash(unsignedEvent);
    const signature = signEvent(unsignedEvent, sk);
    return {
      ...unsignedEvent,
      id: eventHash,
      sig: signature,
    };
  };

  const publishEvent = async (event: UnsignedEvent, _sk?: string) => {
    console.log(event, _sk);
    const signedEvent = createEvent(event, _sk ? _sk : sk ? sk : "");
    relay?.publish(signedEvent);
  };

  const getEvents = async (filters: Filter[]) => {
    const events = await relay?.list(filters);
    console.log(events);
    if (events) setEvents(events);
  };

  const getQuotedEvent = async (filter: Filter): Promise<Event | null | undefined> => {
    const e = await relay?.get(filter);
    return e;
  };

  return (
    <div className="w-screen h-screen mb-5">
      <div className="flex flex-col w-screen">
        <div className="flex flex-row w-screen h-10">
          <div className="flex w-full flex-col items-center justify-center">
            <div
              className="relative mb-8 text-4xl md:text-6xl font-bold hover:cursor-pointer hover:underline hover:decoration-green-300"
              onClick={async () => {
                if (relay) setEvents(await relay.list([{ kinds: [1], limit: 100 }]));
              }}
            ></div>
          </div>
          {/* <div className="flex w-1/6 flex-col items-end mr-10">
            <ThemeSwitcher />
          </div> */}
        </div>
        <div className="flex flex-row h-screen">
          <div className="flex flex-col w-2/6 h-screen p-5 space-y-4">
            {relay && sk && pk ? (
              <CreatePostCard
                setEthTipAmount={setEthTipAmount}
                relay={relay}
                posterPK={pk}
                posterSK={sk}
                publishEvent={publishEvent}
                getEvents={getEvents}
              />
            ) : relay && !sk ? (
              <AuthCard
                privateKey={privateKey}
                setSk={setSk}
                publishEvent={publishEvent}
                setShowKeysModal={setShowKeysModal}
              />
            ) : (
              <></>
            )}

            <RelayCtrlCard relays={RELAYS} curRelayName={curRelayName} setRelay={setCurRelayName} />
          </div>
          <div
            className="flex flex-col w-4/6 p-5 max-h-full overflow-scroll space-y-4"
            onScroll={() => {
              // TODO: Implement fetching new/older events while scrolling ("infinite" content scroll)
            }}
          >
            {showEventsLoader && <EventLoader />}

            {events && (
              <div className="flex flex-col space-y-4">
                {events.map(event => {
                  return (
                    <DisplayEventCard
                      ethTipAmount={ethTipAmount}
                      signer={signer}
                      relay={relay}
                      pk={pk ? pk : null}
                      event={event}
                      getEvents={getEvents}
                      getEvent={getQuotedEvent}
                      key={event.id}
                      showEvent={showEventsLoader}
                      publishEvent={publishEvent}
                    />
                  );
                })}
              </div>
            )}
          </div>
          {sk && pk && showKeysModal ? <CreatedAccModal sk={sk} pk={pk} setShowKeysModal={setShowKeysModal} /> : <></>}
        </div>
      </div>
    </div>
  );
};

export default Client;
