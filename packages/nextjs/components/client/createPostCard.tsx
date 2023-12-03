import { useRef } from "react";
import { useProfile } from "../../hooks/scaffold-eth/useProfile";
import { Filter, Relay, UnsignedEvent } from "nostr-tools";
import { LazyLoadImage } from "react-lazy-load-image-component";

interface CreatePostCardProps {
  posterPK: string;
  posterSK: string;
  relay: Relay;
  publishEvent: (event: UnsignedEvent) => void;
  getEvents: (filters: Filter[]) => void;
  setEthTipAmount: (amount: string) => void;
}

export default function CreatePostCard(props: CreatePostCardProps) {
  const { data: userData } = useProfile({ pubkey: props.posterPK, relay: props.relay });

  const textArea = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="divide-y divide-white overflow-hidden rounded-lgshadow border border-dashed">
      <div
        className="px-4 py-5 sm:px-6 text-lg hover:dark:bg-base-300/25 hover:!text-xl hover:cursor-pointer hover:underline hover:decoration-green-300"
        onClick={() => {
          const filter: Filter[] = [
            {
              kinds: [1, 6],
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
          <textarea
            name="post"
            id="post"
            className="block w-full h-32 bg-gray-900/25 dark:bg-white/25 rounded-lg p-1.5 text-gray-900 text-xl shadow ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-300 sm:leading-6 dark:text-white placeholder:text-gray-800 dark:placeholder:text-gray-200"
            placeholder="Type your post..."
            ref={textArea}
          ></textarea>
          <button
            className="mt-5 btn btn-ghost"
            onClick={() => {
              const newEvent = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: textArea?.current?.value,
                pubkey: props.posterPK,
              };

              props.publishEvent(newEvent as UnsignedEvent);
            }}
          >
            Publish
          </button>
        </div>
        <div className="my-5">
          <span className="text-gray-800 dark:text-gray-200">Tip with ETH</span>
          <input
            className="input input-ghost w-full my-2"
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
