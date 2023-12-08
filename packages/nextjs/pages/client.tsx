import { useEffect, useState } from "react";
import AuthCard from "../components/client/authCard";
import CreatePostCard from "../components/client/createPostCard";
import CreatedAccModal from "../components/client/createdAccModal";
import DisplayEventCard from "../components/client/displayEventCard";
import EventLoader from "../components/client/eventLoader";
import RelayCtrlCard from "../components/client/relayCtrlCard";
import TrendingProfiles from "../components/client/trendingProfiles";
import { RELAYS } from "../utils/constants";
import { NextPage } from "next";
import { Event, Filter, Relay, UnsignedEvent, getEventHash, getPublicKey, nip19, relayInit, signEvent } from "nostr-tools";
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
  const [curRelayName, setCurRelayName] = useState<string>("wss://relay.damus.io");
  const [relay, setRelay] = useState<Relay | null>(null);
  const [sk, setSk] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(sk ? getPublicKey(sk) : null);
  const privateKey = useGlobalState(state => state.nostrKeys.sec);

  const { data: signer } = useWalletClient();
  const [ethTipAmount, setEthTipAmount] = useState<string>("");
  const [eventData, setEventData] = useState([]);
  const setFollowerAuthors = useGlobalState(state => state.setFollowerAuthors);

  const fetchEvents = async () => {
    const newEventData = await Promise.all(
      events.map(async event => {
        const result = await relay?.list([{ kinds: [0], authors: [event.pubkey] }]);
        if (
          result &&
          result[0] &&
          result[0]?.content &&
          JSON.parse(result[0].content).name != "" &&
          JSON.parse(result[0].content).picture != ""
        ) {
          return event;
        }
        return event;
      }),
    );

    setEventData(newEventData.filter(Boolean) as any); // filter out undefined values
  };

  useEffect(() => {
    fetchEvents();
  }, [events]);

  useEffect(() => {
    const connectRelay = async () => {
      setShowEventsLoader(true);
      const relay = relayInit(curRelayName);
      await relay.connect();

      relay.on("connect", async () => {
        setRelay(relay);
        const events: Event[] = await relay.list([{ kinds: [1], limit: 100 }]);

        if (events) setEvents(events);

        await fetchEvents();

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
    if (events) setEvents(events);
  };

  const getQuotedEvent = async (filter: Filter): Promise<Event | null | undefined> => {
    const e = await relay?.get(filter);
    return e;
  };

  function handleFollowFilter() {
    // let followedAuthors: Set<string> = new Set();
    let _followedAuthors: string[];

    if (relay) {
      const sub = relay.sub([
        {
          authors: [pk ? pk : ""],
          kinds: [3],
          limit: 10,
        },
      ]);
      sub.on("event", async (event: Event) => {
        _followedAuthors = event.tags.map((pair: string[]) => pair[1]);
        await getEvents([
          {
            authors: _followedAuthors,
            kinds: [1],
            limit: 10,
          },
        ]);
        setFollowerAuthors(_followedAuthors);
      });
    }
  }

  const [tagToFind, setTagToFind] = useState("");
  const [searchType, setSearchType] = useState("");

  return (
    <div className="flex items-center w-screen h-screen ">
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
        </div>
        <div className="flex flex-row h-screen">
          <div className="flex flex-col w-2/6 h-screen p-5 space-y-4">
            {relay && sk && pk ? (
              <div>
                <CreatePostCard
                  setEthTipAmount={setEthTipAmount}
                  relay={relay}
                  posterPK={pk}
                  posterSK={sk}
                  publishEvent={publishEvent}
                  getEvents={getEvents}
                  handleFollowFilter={handleFollowFilter}
                />
              </div>
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
            className="flex flex-col w-4/6 p-5 max-h-full overflow-y-scroll space-y-4"
            onScroll={() => {
              // TODO: Implement fetching new/older events while scrolling ("infinite" content scroll)
            }}
          >
            <nav className={`flex flex-row gap-2 ${showEventsLoader ? "hidden" : "flex"}`}>
              <button
                className="px-4 py-2 sm:px-6 btn-ghost text-white rounded-md hover:secondary"
                onClick={handleFollowFilter}
              >
                Following
              </button>
              <button
                className="px-4 py-2 sm:px-6 btn-ghost text-white rounded-md hover:bg-secondary"
                onClick={async () => {
                  getEvents([{ kinds: [1], limit: 100 }]);
                }}
              >
                General
              </button>

              <button
                className="px-4 py-2 sm:px-6 btn-ghost text-white rounded-md hover:secondary"
                onClick={async () => {
                  const events = await relay?.list([{ kinds: [4] }]);
                  const filteredEvents = events?.filter(event => {
                    if (event.tags && event.tags[0][0] == "p" && event.tags[0][1] == pk) {
                      return event;
                    }
                  });
                  setEvents(filteredEvents as any);
                }}
              >
                Messages
              </button>
              <select
                name="searchType"
                id="searchType"
                onChange={e => {
                  setSearchType(e.target.value);
                }}
              >
                <option value="hashtag">HashTag</option>
                <option value="pubkey">Public Key</option>
                <option value="event">Event</option>
              </select>
              <input
                className="input input-sm my-auto"
                placeholder="HashTag"
                type="text"
                onChange={async e => {
                  setTagToFind(e.target.value);
                }}
              />
              <button
                className="my-auto btn btn-sm btn-ghost"
                onClick={async () => {
                  if (searchType == "hashtag") {
                    const _events = await relay?.list([{ kinds: [1] }]);
                    const filterEvents = _events?.filter((event: any) => {
                      return event.tags.some((tag: any) => tag.length === 2 && tag[0] === "t" && tag[1] === tagToFind);
                    });
                    setEvents(filterEvents as Event[]);
                  } else if (searchType == "pubkey") {
                    if (tagToFind.startsWith("npub")) {
                      const newTagToFind = nip19.decode(tagToFind);
                      const _events = await relay?.list([{ kinds: [1], authors: [String(newTagToFind)] }]);
                      setEvents(_events as Event[]);
                    } else {
                      const _events = await relay?.list([{ kinds: [1], authors: [tagToFind] }]);
                      setEvents(_events as Event[]);
                    }
                  } else if (searchType == "event") {
                    const _events = await relay?.list([{ kinds: [1] }]);
                    if (tagToFind.startsWith("nevent")) {
                      const newTagToFind = nip19.decode(tagToFind);
                      const filterEvents = _events?.filter((event: any) => {
                        return event.id == newTagToFind.data;
                      });
                      setEvents(filterEvents as Event[]);
                    } else {
                      const filterEvents = _events?.filter((event: any) => {
                        return event.id == tagToFind;
                      });
                      setEvents(filterEvents as Event[]);
                    }
                  }
                }}
              >
                search
              </button>
            </nav>
            {showEventsLoader && <EventLoader />}

            {eventData && (
              <div className="flex flex-col space-y-4 divider-white divide-y-2 ">
                {eventData.map((event: Event) => (
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
                    handleFollowFilter={handleFollowFilter}
                  />
                ))}
              </div>
            )}
          </div>
          {sk && pk && showKeysModal ? <CreatedAccModal sk={sk} pk={pk} setShowKeysModal={setShowKeysModal} /> : <></>}
          <div className="parent-container">
            <div className="absolute-bottom-right">
              <button
                className="btn btn-circle btn-outline opacity-60"
                onClick={async () => {
                  getEvents([{ kinds: [1], limit: 100 }]);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            </div>
          </div>
          <TrendingProfiles getEvents={getEvents} />
        </div>
      </div>
    </div>
  );
};

export default Client;