/* eslint-disable prefer-const */
import { useEffect, useState } from "react";
import { useProfile } from "../../hooks/scaffold-eth";
import { extractImageLinks } from "../../utils/parsing";
import RepostEventCard from "./repostEventCard";
import { type Event, Filter, Relay, UnsignedEvent } from "nostr-tools";
import { BsChatRightQuote, BsCurrencyDollar } from "react-icons/bs";
import { FaRetweet } from "react-icons/fa";
import { FcDislike, FcLike } from "react-icons/fc";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { parseEther } from "viem";
import { notification } from "~~/utils/scaffold-eth";

interface DisplayEventCardProps {
  pk: string | null;
  event: Event;
  showEvent: boolean;
  relay: Relay | null;
  signer: any;
  ethTipAmount: string;
  getEvents: (filters: Filter[]) => void;
  getEvent: (filter: Filter) => Promise<Event | null | undefined>;
  publishEvent: (event: UnsignedEvent, _sk?: string) => void;
}

interface ReactionStats {
  nLikes: number;
  nDislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  userReposted: boolean;
}

export default function DisplayEventCard(props: DisplayEventCardProps) {
  function getReactionStats(reactions: Event[]): ReactionStats {
    const stats: ReactionStats = {
      nLikes: 0,
      nDislikes: 0,
      userLiked: false,
      userDisliked: false,
      userReposted: false,
    };
    for (let i = 0; i < reactions.length; i++) {
      const { content, pubkey, kind } = reactions[i];
      if (["+", "🤙", "👍", "🤍"].includes(content)) {
        stats.nLikes++;
        if (pubkey === props.pk) stats.userLiked = true;
      } else if (["-", "👎"].includes(content)) {
        stats.nDislikes++;
        if (pubkey === props.pk) stats.userDisliked = true;
      } else if (kind == 6) stats.userReposted = true;
    }

    return stats;
  }

  const [selectedRelay, setSelectedRelay] = useState<Relay>(props.relay as Relay);

  useEffect(() => {
    if (!props.relay) return;
    setSelectedRelay(props.relay);
  }, [props.relay]);

  const { data: userData } = useProfile({ pubkey: props.event.pubkey, relay: selectedRelay });

  /*  const reactionEvents = useNostrEvents({
    filter: {
      "#e": [props.event.id],
      kinds: [6, 7],
    },
  }).events; */

  const [reactionEvents, setReactionEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchReactionEvents = async () => {
      const events = await selectedRelay.list([
        {
          "#e": [props.event.id],
          kinds: [6, 7],
        },
      ]);
      setReactionEvents(events);
    };
    fetchReactionEvents();
  }, [selectedRelay, props.event.id]);

  const { txtContent, imgLinks } = extractImageLinks(props.event.content);

  let { nLikes, nDislikes, userLiked, userDisliked, userReposted }: ReactionStats = getReactionStats(reactionEvents);

  // If event is a simple repost
  if (props.event.kind == 6) {
    return (
      <RepostEventCard
        relay={props.relay}
        event={props.event}
        pk={props.pk}
        publishEvent={props.publishEvent}
        getEvents={props.getEvents}
        getEvent={props.getEvent}
        showEvent={props.showEvent}
        isQuotedRepost={false}
      />
    );
  }

  // If event is refrencing another event
  if (props.event.tags[0] && props.event.tags[0][0] == "e") {
    return (
      <RepostEventCard
        relay={props.relay}
        event={props.event}
        pk={props.pk}
        publishEvent={props.publishEvent}
        getEvents={props.getEvents}
        getEvent={props.getEvent}
        showEvent={props.showEvent}
        isQuotedRepost={true}
      />
    );
  }

  return (
    <div
      className="rounded-xl  overflow-hidden rounded-lgshadow border border-base "
      hidden={props.showEvent ? true : false}
    >
      <div
        className="px-4 py-5 sm:px-6 text-lg hover:!text-xl hover:cursor-pointer hover:underline hover:decoration-green-300"
        onClick={() => {
          const filter: Filter[] = [
            {
              kinds: [1],
              authors: [props.event.pubkey],
            },
          ];
          props.getEvents(filter);
        }}
      >
        <div className="flex flex-row justify-between">
          <LazyLoadImage className="inline-block h-8 w-8 rounded-full" src={userData?.picture} alt="Profile" />
          <span className="font-bold">{userData?.name}</span>
          <span className="inline-flex items-center gap-x-1.5 rounded-md  px-1.5 py-0.5 text-xs font-medium">
            <svg className="h-1.5 w-1.5" viewBox="0 0 6 6" aria-hidden="true">
              <circle cx="3" cy="3" r="3" />
            </svg>
            b{props.event.pubkey.slice(props.event.pubkey.length - 6)}
          </span>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <div className="mt-2">
          <span className="text-lg text-gray-800 dark:text-gray-200">{txtContent}</span>
          {imgLinks
            ? //image link found
              imgLinks.map((imgLink, i) => {
                return <LazyLoadImage src={imgLink} key={i}></LazyLoadImage>;
              })
            : // no img link found so just return nothing
              null}
        </div>
      </div>
      <div className="px-4 py-2 sm:px-6 text-lg">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row justify-start space-x-1">
            <button
              className={userDisliked ? "hover:bg-success p-2" : "hover:bg-success hover:dark::bg-primary p-2"}
              onClick={() => {
                if (!props.pk) return;

                if (userLiked) userLiked = false;
                userDisliked = userDisliked ? false : true;

                props.publishEvent({
                  kind: 7,
                  content: "-",
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [
                    ["e", props.event.id],
                    ["p", props.event.pubkey],
                  ],
                  pubkey: props.pk,
                });
              }}
            >
              <div className="flex flex-row items-center space-x-2">
                <FcDislike className="h-5 w-5 hover:cursor-pointer" />
                <span className={userDisliked ? "hover:bg-success p-1" : "hover:bg-success hover:dark::bg-primary p-1"}>
                  {nDislikes}
                </span>
              </div>
            </button>
            <button
              className={userLiked ? "hover:bg-success p-1" : "hover:bg-success hover:dark::bg-primary p-1"}
              onClick={() => {
                if (!props.pk) return;

                if (userDisliked) userDisliked = false;
                userLiked = userLiked ? false : true;

                props.publishEvent({
                  kind: 7,
                  content: "+",
                  created_at: Math.floor(Date.now() / 1000),
                  tags: [
                    ["e", props.event.id],
                    ["p", props.event.pubkey],
                  ],
                  pubkey: props.pk,
                });
              }}
            >
              <div className="flex flex-row items-center space-x-2">
                <FcLike className="h-5 w-5 hover:cursor-pointer" />
                <span className={userLiked ? "text-primary dark:text-white" : "text-white"}>{nLikes}</span>
              </div>
            </button>
          </div>
          <div className="flex flex-row justify-start space-x-1">
            <button
              className={userReposted ? "hover:bg-success p-1" : "hover:bg-success hover:dark::bg-primary p-1"}
              onClick={() => {
                if (!props.pk) return;

                props.publishEvent({
                  kind: 6,
                  content: JSON.stringify(props.event), // for quick lookup
                  created_at: Math.floor(Date.now() / 1000),
                  pubkey: props.pk,
                  tags: [
                    ["e", props.event.id],
                    ["p", props.event.pubkey],
                  ],
                });
              }}
            >
              <div className="flex flex-row items-center">
                <FaRetweet className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
            <button
              className="hover:bg-success hover:dark::bg-primary p-1"
              onClick={() => {
                if (!props.pk) return;

                props.publishEvent({
                  kind: 1,
                  content: "quoted reply to event: " + props.event.id, // empty for now gotta build ui/ux to get user input
                  created_at: Math.floor(Date.now() / 1000),
                  pubkey: props.pk,
                  tags: [
                    ["e", props.event.id],
                    ["p", props.event.pubkey],
                  ],
                });
              }}
            >
              <div className="flex flex-row items-center">
                <BsChatRightQuote className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
            <button
              className="hover:bg-success hover:dark::bg-primary p-1"
              onClick={async () => {
                console.log("tip");
                const result = await props.getEvent({
                  kinds: [30078],
                  authors: [props.event.pubkey],
                });

                if (props?.ethTipAmount && props?.signer && result && result.content.startsWith("0x")) {
                  await props?.signer?.sendTransaction({
                    to: String(result?.content),
                    value: parseEther(String(props?.ethTipAmount)),
                  });
                } else {
                  notification.error("Nostr3 account not found");
                }
              }}
            >
              <div className="flex flex-row items-center">
                <BsCurrencyDollar className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
