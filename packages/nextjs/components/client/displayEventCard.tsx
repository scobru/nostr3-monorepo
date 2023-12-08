/* eslint-disable prefer-const */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "../../hooks/scaffold-eth";
import { extractImageLinks } from "../../utils/parsing";
import RepostEventCard from "./repostEventCard";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import { type Event, Filter, Relay, UnsignedEvent, nip19 } from "nostr-tools";
import { BsChatLeftDots, BsChatRightQuote, BsCurrencyDollar } from "react-icons/bs";
import { FaRetweet } from "react-icons/fa";
import { FcDislike, FcLike } from "react-icons/fc";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { parseEther } from "viem";
import { useGlobalState } from "~~/services/store/store";
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
  handleFollowFilter: any;
}

interface ReactionStats {
  nLikes: number;
  nDislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  userReposted: boolean;
  userFollow: boolean;
}

export default function DisplayEventCard(props: DisplayEventCardProps) {
  const privateKey = useGlobalState(state => state.nostrKeys.sec);
  const publicKey = useGlobalState(state => state.nostrKeys.pub);
  const nostr3 = new Nostr3(privateKey);
  const nostr3List = useGlobalState(state => state.nostr3List);
  const setEvent = useGlobalState(state => state.setEvent);
  const [nevent, setNevent] = useState<Event | null>(null);
  const [isNostr3Account, setIsNostr3Account] = useState<boolean>(false);
  const followerAuthors = useGlobalState(state => state.followerAuthors);
  const setFollowerAuthors = useGlobalState(state => state.setFollowerAuthors);

  function getReactionStats(reactions: Event[]): ReactionStats {
    const stats: ReactionStats = {
      nLikes: 0,
      nDislikes: 0,
      userLiked: false,
      userDisliked: false,
      userReposted: false,
      userFollow: false,
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

    stats.userFollow = followerAuthors.includes(String(props.event.pubkey));

    return stats;
  }

  const [selectedRelay, setSelectedRelay] = useState<Relay>(props.relay as Relay);

  useEffect(() => {
    if (!props.relay) return;
    setSelectedRelay(props.relay);
  }, [props.relay]);

  const { data: userData } = useProfile({ pubkey: props.event.pubkey, relay: selectedRelay });

  const [reactionEvents, setReactionEvents] = useState<Event[]>([]);

  const fetchReactionEvents = async () => {
    const events = await selectedRelay.list([
      {
        "#e": [props.event.id],
        kinds: [6, 7],
      },
    ]);
    setReactionEvents(events);
  };

  useEffect(() => {
    fetchReactionEvents();
  }, [selectedRelay, props.event.id]);

  const [content, setContent] = useState("");
  const [txtContent, setTxtContent] = useState("");
  const [imgLinks, setImgLinks] = useState<string[]>([]);

  useEffect(() => {
    const runDecryptContent = async () => {
      const decryptedContent = await nostr3.decryptDM(props.event.content, props.event.tags[0][1]);
      setContent(decryptedContent);
    };

    if (props.event.kind == 4) {
      runDecryptContent();
    } else {
      setContent(props.event.content as string);
    }
  }, [props.event, publicKey]);

  useEffect(() => {
    if (content) {
      const { txtContent, imgLinks } = extractImageLinks(String(content));
      setTxtContent(String(txtContent));
      setImgLinks(imgLinks);
    }
  }, [content]);

  const [evmAddress, setEvmAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!nostr3List) return;
    // check if the props.event.pubkey is contained in nostr3List.pubkey index
    const isNostr3Account = nostr3List.some((item: { pubkey: string }) => item.pubkey === props.event.pubkey);
    // fetch evmAddress from nostr3List  when item.pubkey === props.event.pubkey
    const evmAddress = nostr3List.find((item: { pubkey: string }) => item.pubkey === props.event.pubkey)?.evmAddress;
    setEvmAddress(evmAddress);
    setIsNostr3Account(isNostr3Account);
  }, [nostr3List, props.event.pubkey]);

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
    setReactionStats(stats);
  }, [reactionEvents]);

  useEffect(() => {
    const run = async () => {
      const _nevent = await nip19.neventEncode(props.event);
      setNevent(_nevent as any);
    };
    run();
  }, [props.event]);

  // If event is a simple repost
  if (props.event.kind == 6) {
    return (
      <div className="divider-white divide-y-2">
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
      </div>
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
      className={`overflow-hidden shadow  ${isNostr3Account ? "bg-slate-800 border-dashed shadow-success shadow-sm" : "bg-inherit "
        }`}
      hidden={props.showEvent ? true : false}
    >
      {isNostr3Account && (
        <div className="badge-success">
          <span className="font-semibold mx-2 my-2">Nostr3 Account: {evmAddress}</span>
        </div>
      )}

      <div
        className="px-4 py-5 sm:px-6 text-lg hover:!text-xl hover:cursor-pointer hover:underline hover:decoration-green-300"
        onClick={() => {
          const filter: Filter[] = [
            {
              kinds: [1],
              authors: [props.event.pubkey],
              limit: 100,
            },
          ];

          props.getEvents(filter);
        }}
      >
        <div className="flex flex-row justify-between  p-3">
          <LazyLoadImage className="inline-block h-16 w-16 rounded-full" src={userData?.picture} alt="Profile" />
          <span className="font-bold my-auto">{userData?.name}</span>
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
      <Link
        href={"https://njump.me/" + nevent}
        className="px-4 py-2 sm:px-6 text-lg"
        target="_blank"
        rel="noopener noreferrer"
      >
        event
      </Link>
      <Link
        href={"https://njump.me/" + nip19.nprofileEncode(props.event)}
        className="px-4 py-2 sm:px-6 text-lg"
        target="_blank"
        rel="noopener noreferrer"
      >
        profile
      </Link>
      <Link
        href={"https://njump.me/" + nip19.npubEncode(props.event.pubkey)}
        className="px-4 py-2 sm:px-6 text-lg"
        target="_blank"
        rel="noopener noreferrer"
      >
        pubKey
      </Link>
      <div className="px-4 py-2 sm:px-6 text-lg">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row justify-start space-x-1">
            <button
              className={
                reactionStats.userDisliked ? "hover:bg-success p-2" : "hover:bg-success hover:dark::bg-primary p-2"
              }
              onClick={async () => {
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

                await fetchReactionEvents();

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
                reactionStats.userLiked ? "hover:bg-success p-1" : "hover:bg-success hover:dark::bg-primary p-1"
              }
              onClick={async () => {
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
                <span className={reactionStats.userLiked ? "text-primary dark:text-white" : "text-white"}>
                  {reactionStats.nLikes}
                </span>
              </div>
            </button>
            {reactionStats.userFollow == false ? (
              <button
                className={reactionStats.userFollow ? "p-1" : "p-1"}
                onClick={async () => {
                  if (!props.pk) return;

                  // If props.event.pubkey is not in followAuthors, add it
                  if (props.event.pubkey && !followerAuthors.includes(props.event.pubkey)) {
                    followerAuthors.push(props.event.pubkey);
                  }

                  const tags = followerAuthors.map((author: any) => ["p", author]);

                  props.publishEvent({
                    kind: 3,
                    content: "{}",
                    created_at: Math.floor(Date.now() / 1000),
                    tags: tags,
                    pubkey: props.pk,
                  });

                  setFollowerAuthors(followerAuthors);
                  setReactionStats(prevStats => ({
                    ...prevStats,
                    userFollow: true,
                  }));
                }}
              >
                <div className="flex flex-row items-center space-x-2"></div>
                <button className="btn btn-sm hover:btn-success">FOLLOW</button>
              </button>
            ) : (
              <button
                className="btn btn-sm hover:btn-danger my-auto"
                onClick={async () => {
                  const index = followerAuthors.indexOf(props.event.pubkey);
                  if (index > -1) {
                    followerAuthors.splice(index, 1);
                  }

                  const tags = followerAuthors.map((author: any) => ["p", author]);

                  props.publishEvent({
                    kind: 3,
                    content: "{}",
                    created_at: Math.floor(Date.now() / 1000),
                    tags: tags,
                    pubkey: props.pk!,
                  });

                  setReactionStats(prevStats => ({
                    ...prevStats,
                    userFollow: false,
                  }));
                }}
              >
                UNFOLLOW
              </button>
            )}
          </div>
          <div className="flex flex-row justify-start space-x-1">
            <button
              className="hover:bg-success hover:dark::bg-primary p-1"
              onClick={() => {
                setEvent(props.event);
              }}
            >
              <div className="flex flex-row items-center">
                <BsChatLeftDots className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
            <button
              className={
                reactionStats.userReposted ? "hover:bg-success p-1" : "hover:bg-success hover:dark::bg-primary p-1"
              }
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

                notification.success("Reposted");
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

                notification.success("Quoted");
              }}
            >
              <div className="flex flex-row items-center">
                <BsChatRightQuote className="h-5 w-5 hover:cursor-pointer text-green-300" />
              </div>
            </button>
            {isNostr3Account ? (
              <button
                className="hover:bg-success hover:dark::bg-primary p-1"
                onClick={async () => {
                  if (props?.ethTipAmount && props?.signer && evmAddress) {
                    await props?.signer?.sendTransaction({
                      to: String(evmAddress),
                      value: parseEther(String(props?.ethTipAmount)),
                    });
                  } else {
                    notification.error("Nostr3 account not found or tip amount not set");
                  }
                }}
              >
                <div className="flex flex-row items-center">
                  <BsCurrencyDollar className="h-5 w-5 hover:cursor-pointer text-green-300" />
                </div>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
