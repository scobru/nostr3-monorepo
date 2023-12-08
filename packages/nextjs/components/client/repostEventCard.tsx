import { useEffect, useState } from "react";
import { useProfile } from "../../hooks/scaffold-eth";
import { extractImageLinks } from "../../utils/parsing";
import RepostedEventCard from "./repostedEventCard";
import { type Event, Filter, Relay, UnsignedEvent } from "nostr-tools";
import { BsChatRightQuote } from "react-icons/bs";
import { FaRetweet } from "react-icons/fa";
import { FcDislike, FcLike } from "react-icons/fc";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { useGlobalState } from "~~/services/store/store";
import { notification } from "~~/utils/scaffold-eth";

interface RepostEventCardProps {
  pk: string | null;
  event: Event;
  showEvent: boolean;
  relay: Relay | null;
  getEvents: (filters: Filter[]) => void;
  getEvent: (filter: Filter) => Promise<Event | null | undefined>;
  publishEvent: (event: UnsignedEvent, _sk?: string) => void;
  isQuotedRepost: boolean;
}
interface ReactionStats {
  nLikes: number;
  nDislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  userReposted: boolean;
}

export default function RepostEventCard(props: RepostEventCardProps) {
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
      if (["+", "🤙", "👍", "🤍", "🖤", "💔", "🖖"].includes(content)) {
        stats.nLikes++;
        if (pubkey === props.pk) stats.userLiked = true;
      } else if (["-", "👎"].includes(content)) {
        stats.nDislikes++;
        if (pubkey === props.pk) stats.userDisliked = true;
      } else if (kind == 6) {
        stats.userReposted = true;
      }
    }

    return stats;
  }

  const [isNostr3Account, setIsNostr3Account] = useState<boolean>(false);
  const nostr3List = useGlobalState(state => state.nostr3List);

  const [selectedRelay, setSelectedRelay] = useState<Relay>(props.relay as Relay);
  const [reactionEvents, setReactionEvents] = useState([]);

  useEffect(() => {
    if (!props.relay) return;
    setSelectedRelay(props.relay);
  }, [props.relay]);

  useEffect(() => {
    if (!nostr3List) return;
    // check if the props.event.pubkey is contained in nostr3List.pubkey index
    const isNostr3Account = nostr3List.some((item: { pubkey: string }) => item.pubkey === props.event.pubkey);
    setIsNostr3Account(isNostr3Account);
  }, [nostr3List, props.event.pubkey]);

  const [relevantEvent, setRelevantEvent] = useState<Event | null>(null);
  const { txtContent, imgLinks } = extractImageLinks(props.event.content);

  const { data: userData } = useProfile({ pubkey: props.event.pubkey, relay: props.relay as Relay });

  const [reactionStats, setReactionStats] = useState({
    nLikes: 0,
    nDislikes: 0,
    userLiked: false,
    userDisliked: false,
    userReposted: false,
    userFollow: false,
  });

  useEffect(() => {
    const stats = getReactionStats(reactionEvents);
    setReactionStats(stats as any);
  }, [reactionEvents]);

  useEffect(() => {
    if (props.isQuotedRepost) {
      props
        .getEvent({
          ids: [props.event.tags[0][1]],
        })
        .then(event => {
          if (event) setRelevantEvent(event);
        });
    } else {
      setRelevantEvent(JSON.parse(props.event.content));
    }
  }, [props.isQuotedRepost]);

  const fetchReactionEvents = async () => {
    const events = await selectedRelay.list([
      {
        "#e": [props.event.id],
        kinds: [6, 7],
      },
    ]);
    setReactionEvents(events as any);
  };

  useEffect(() => {
    fetchReactionEvents();
  }, [selectedRelay, props.event.id]);

  return (
    <div className="overflow-hidden bg-base-100 shadow  " hidden={props.showEvent ? true : false}>
      {isNostr3Account && (
        <div className="badge-success">
          <span className="font-semibold mx-2 my-2">Nostr3 Account</span>
        </div>
      )}
      <div
        className="px-4 py-5 sm:px-6 text-lg hover:bg-base-300/25 hover:!text-xl hover:cursor-pointer hover:underline hover:decoration-green-300"
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
          <LazyLoadImage className="inline-block h-8 w-8 rounded-full" src={userData?.picture} alt="" />
          <span className="font-bold text-gray-800 dark:text-gray-200">{userData?.name}</span>
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-secondary-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
            <svg className="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
              <circle cx="3" cy="3" r="3" />
            </svg>
            {props.event.pubkey.slice(props.event.pubkey.length - 6)}
          </span>
        </div>
      </div>
      <div className="px-4 py-5 sm:p-6 w-full">
        <div className="mt-2 w-full divider-white divider-y-2">
          <span className="inline-block w-full text-lg text-gray-800 dark:text-gray-200 text-start pl-2 pb-2">
            {props.event.kind == 6 ? (
              <>
                <FaRetweet className="inline-block h-5 w-5 text-green-700 dark:text-green-300 pb-1" />{" "}
                <span className="underline decoration-green-700 dark:decoration-green-300">{userData?.name}</span>{" "}
                reposted:
              </>
            ) : (
              <>
                {txtContent}
                {imgLinks
                  ? imgLinks.map((imgLink, i) => {
                      return <LazyLoadImage src={imgLink} key={i}></LazyLoadImage>;
                    })
                  : null}
              </>
            )}
          </span>

          {relevantEvent && (
            <RepostedEventCard
              relay={selectedRelay}
              pk={props.pk}
              event={relevantEvent}
              getEvents={props.getEvents}
              getEvent={props.getEvent}
              showEvent={props.showEvent}
              publishEvent={props.publishEvent}
              key={props.event.id}
            />
          )}
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6 text-lg">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row justify-start space-x-1">
            <button
              className={
                reactionStats.userDisliked ? "hover:bg-success p-2" : "hover:bg-success hover:dark::bg-primary p-2"
              }
              onClick={() => {
                if (!props.pk) return;

                if (reactionStats.userLiked) reactionStats.userLiked = false;
                reactionStats.userDisliked = reactionStats.userDisliked ? false : true;

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

                setReactionStats(prevStats => ({
                  ...prevStats,
                  nDislikes: prevStats.nDislikes + 1,
                }));
              }}
            >
              <div className="flex flex-row items-center space-x-2">
                <FcDislike className="h-5 w-5 hover:cursor-pointer" />
                <span
                  className={
                    reactionStats.userDisliked ? "hover:bg-red p-1" : "hover:bg-red hover:dark::bg-primary p-1"
                  }
                >
                  {reactionStats.nDislikes}
                </span>
              </div>
            </button>
            <button
              className={
                reactionStats.userLiked ? "hover:bg-success p-2" : "hover:bg-success hover:dark::bg-primary p-2"
              }
              onClick={() => {
                if (!props.pk) return;

                if (reactionStats.userDisliked) reactionStats.userDisliked = false;
                reactionStats.userLiked = reactionStats.userLiked ? false : true;

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

                setReactionStats(prevStats => ({
                  ...prevStats,
                  nLikes: prevStats.nLikes + 1,
                }));
              }}
            >
              <div className="flex flex-row items-center space-x-2">
                <FcLike className="h-5 w-5 hover:cursor-pointer" />
                <span
                  className={
                    reactionStats.userLiked ? "hover:bg-success p-1" : "hover:bg-red hover:dark::bg-primary p-1"
                  }
                >
                  {reactionStats.nLikes}
                </span>
              </div>
            </button>
          </div>
          <div className="flex flex-row justify-start space-x-1">
            <button
              className={reactionStats.userReposted ? "hover:bg-red p-1" : "hover:bg-red hover:dark::bg-primary p-1"}
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

                setReactionStats(prevStats => ({
                  ...prevStats,
                  userReposted: true,
                }));

                notification.success("Reposted");
              }}
            >
              <div className="flex flex-row items-center">
                <FaRetweet className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
            <button
              className="hover:bg-red p-1"
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

                notification.success("Quoted");
              }}
            >
              <div className="flex flex-row items-center">
                <BsChatRightQuote className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
