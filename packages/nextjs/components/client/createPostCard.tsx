import { useEffect, useRef, useState } from "react";
import { useProfile } from "../../hooks/scaffold-eth/useProfile";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import { Filter, Relay, UnsignedEvent } from "nostr-tools";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { useGlobalState } from "~~/services/store/store";
import { notification } from "~~/utils/scaffold-eth";

interface CreatePostCardProps {
  posterPK: string;
  posterSK: string;
  relay: Relay;
  publishEvent: (event: UnsignedEvent) => void;
  getEvents: (filters: Filter[]) => void;
  setEthTipAmount: (amount: string) => void;
  handleFollowFilter: any;
}

export default function CreatePostCard(props: CreatePostCardProps) {
  const { data: userData } = useProfile({ pubkey: props.posterPK, relay: props.relay });
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const textArea = useRef<HTMLTextAreaElement | null>(null);
  const privateKey = useGlobalState(state => state.nostrKeys.sec);
  const [pubKeyReceiver, setPubKeyReceiver] = useState<string>("");
  const [toMe, setToMe] = useState<boolean>(false);
  const [isDM, setIsDM] = useState<boolean>(false);
  const nostr3 = new Nostr3(privateKey);
  const setEvent = useGlobalState(state => state.setEvent);
  const [proposedEventId, setProposedEventId] = useState<any>("");
  const [proposedPubkey, setProposedPubkey] = useState<any>("");
  const event = useGlobalState(state => state.event);

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
    return [...hashtags];
  };

  useEffect(() => {
    if (event) {
      setProposedEventId(event.id);
      setProposedPubkey(event?.pubkey);
      setIsEncrypted(false);
      setIsDM(false);
    }
  }, [event, proposedEventId]);

  useEffect(() => {
    props.handleFollowFilter();
  }, []);

  return (
    <div
      className={`divide-y divide-white rounded-lg shadow border-collapse border bg-base-300   ${
        proposedEventId ? "border-success border-2 shadow-lg shadow-success" : " border-dashed"
      }`}
    >
      <div
        className="  px-4 py-2 sm:px-6  text-lg hover:dark:bg-base-300/25 hover:!text-xl hover:cursor-pointer hover:underline hover:decoration-green-300"
        onClick={() => {
          const filter: Filter[] = [
            {
              kinds: [1, 6, 4],
              authors: [props.posterPK],
            },
          ];
          props.getEvents(filter);
        }}
      >
        <div className="flex flex-row justify-between">
          <LazyLoadImage className="inline-block h-8 w-8 rounded-full" src={userData?.picture} alt="" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{userData?.name}</span>
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-base-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
            <svg className="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
              <circle cx="3" cy="3" r="3" />
            </svg>
            {props.posterPK?.slice(props.posterPK?.length - 6)}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 sm:p-6">
        <div className="mt-2">
          <div className="flex items-center my-4">
            <input
              type="checkbox"
              className="input input-checkbox mx-2"
              placeholder="Encrypt"
              onChange={e => {
                setIsEncrypted(e.target.checked);
              }}
            />
            <span>Encrypt</span>
            <input
              type="checkbox"
              className="input input-checkbox mx-2"
              placeholder="Encrypt"
              onChange={e => {
                setToMe(e.target.checked);
                setPubKeyReceiver(props.posterPK);
              }}
            />
            <span>To me</span>
            <input
              type="checkbox"
              className="input input-checkbox mx-2"
              placeholder="Encrypt"
              checked={isDM}
              onChange={e => {
                setIsDM(e.target.checked);
              }}
            />
            <span>DM</span>
            {(isEncrypted && !toMe) || isDM ? (
              <input
                type="text"
                className="input input-ghost input-sm mx-4"
                placeholder="Receiver Public Key"
                value={pubKeyReceiver}
                onChange={e => {
                  setPubKeyReceiver(e.target.value);
                }}
              />
            ) : null}
          </div>

          <div>
            {proposedEventId ? (
              <div className="my-2">
                Answer to event {""}
                <span className="inline-flex items-center gap-x-1.5 rounded-md bg-base-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                  <svg className="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
                    <circle cx="3" cy="3" r="3" />
                  </svg>
                  {proposedEventId.slice(proposedEventId.length - 6)}
                </span>
              </div>
            ) : null}
          </div>
          <button
            onClick={() => {
              setProposedEventId("");
              setEvent("");
            }}
            className="btn btn-ghost btn-sm my-5"
          >
            reset
          </button>
          <textarea
            name="post"
            id="post"
            className="block w-full h-32  bg-gray-900/25 dark:bg-white/25 rounded-lg p-1.5 text-gray-900 text-base shadow ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-300 sm:leading-6 dark:text-white  dark:placeholder:text-gray-200"
            placeholder="Type your post..."
            ref={textArea}
          ></textarea>
          <button
            className="mt-5 btn btn-ghost"
            onClick={async () => {
              if (!isEncrypted && !isDM && !proposedEventId) {
                const newEvent = {
                  kind: 1,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [] as string[][],
                  content: textArea?.current?.value,
                  pubkey: props.posterPK,
                };

                const hashtags = extractHashtags(String(textArea?.current?.value));

                if (hashtags) {
                  newEvent.tags = hashtags.map(hashtag => ["t", hashtag]);
                }
                props.publishEvent(newEvent as UnsignedEvent);
              } else if (proposedEventId) {
                const newEvent = {
                  kind: 1,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [
                    ["e", proposedEventId],
                    ["p", proposedPubkey],
                  ],
                  content: textArea?.current?.value,
                  pubkey: props.posterPK,
                };

                props.publishEvent(newEvent as UnsignedEvent);
              } else if (toMe && isEncrypted) {
                const ciphertext = await nostr3.encryptDM(textArea?.current?.value, props.posterPK);
                const newEvent = {
                  kind: 4,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [["p", props.posterPK]],
                  content: ciphertext,
                  pubkey: props.posterPK,
                };

                props.publishEvent(newEvent as UnsignedEvent);
              } else if (isDM) {
                const ciphertext = await nostr3.encryptDM(textArea?.current?.value, pubKeyReceiver);
                const newEvent = {
                  kind: 4,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [["p", pubKeyReceiver]],
                  content: ciphertext,
                  pubkey: props.posterPK,
                };

                props.publishEvent(newEvent as UnsignedEvent);
              } else if (isDM && isEncrypted) {
                const ciphertext = await nostr3.encryptDM(textArea?.current?.value, pubKeyReceiver);
                const newEvent = {
                  kind: 4,
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [["p", pubKeyReceiver]],
                  content: ciphertext,
                  pubkey: props.posterPK,
                };

                props.publishEvent(newEvent as UnsignedEvent);
              }

              setProposedEventId("");
              setEvent("");
              notification.success("Posted");
            }}
          >
            Publish
          </button>
        </div>
        <div className="my-5">
          <span className=" dark:text-gray-200">Tip with ETH</span>
          <input
            className="input input-primary w-full my-2"
            placeholder="Amount to tip"
            onChange={e => {
              props.setEthTipAmount(e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
