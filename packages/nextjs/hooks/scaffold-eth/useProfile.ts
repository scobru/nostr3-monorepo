import { useEffect, useState } from "react";
import { atom, useAtom } from "jotai";
import { Relay } from "nostr-tools";
import nip19 from "nostr-tools";

const uniqValues = (value: string, index: number, self: string[]) => {
  return self.indexOf(value) === index;
};

export interface Metadata {
  name?: string;
  username?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  lud06?: string;
  lud16?: string;
  nip05?: string;
}

const QUEUE_DEBOUNCE_DURATION = 1000;

let timer: NodeJS.Timeout | undefined = undefined;

const queuedPubkeysAtom = atom<string[]>([]);
const requestedPubkeysAtom = atom<string[]>([]);
const fetchedProfilesAtom = atom<Record<string, Metadata>>({});

function useProfileQueue({ pubkey }: { pubkey: string }) {
  const [isReadyToFetch, setIsReadyToFetch] = useState(false);

  const [queuedPubkeys, setQueuedPubkeys] = useAtom(queuedPubkeysAtom);

  const [requestedPubkeys] = useAtom(requestedPubkeysAtom);
  const alreadyRequested = !!requestedPubkeys.includes(pubkey);

  useEffect(() => {
    if (alreadyRequested) {
      return;
    }

    clearTimeout(timer);

    timer = setTimeout(() => {
      setIsReadyToFetch(true);
    }, QUEUE_DEBOUNCE_DURATION);

    setQueuedPubkeys((_pubkeys: string[]) => {
      // Unique values only:
      const arr = [..._pubkeys, pubkey].filter(uniqValues).filter(_pubkey => {
        return !requestedPubkeys.includes(_pubkey);
      });

      return arr;
    });

    return () => clearTimeout(timer);
  }, [pubkey, setQueuedPubkeys, alreadyRequested, requestedPubkeys]);

  return {
    pubkeysToFetch: isReadyToFetch ? queuedPubkeys : [],
  };
}

export function useProfile({
  pubkey,
  relay,
  enabled: _enabled = true,
}: {
  pubkey: string;
  relay: Relay;
  enabled?: boolean;
}) {
  const [, setRequestedPubkeys] = useAtom(requestedPubkeysAtom);
  const { pubkeysToFetch } = useProfileQueue({ pubkey });
  const enabled = _enabled && !!pubkeysToFetch.length;
  const [, setMetadata] = useState<Metadata | undefined>(undefined);
  const [npub, setNpub] = useState<string | undefined>("");

  const [fetchedProfiles, setFetchedProfiles] = useAtom(fetchedProfilesAtom);

  /* const { onEvent, onSubscribe, isLoading, onDone } = useNostrEvents({
    filter: {
      kinds: [0],
      authors: pubkeysToFetch,
    },
    enabled: true,
  });

 

  onEvent(rawMetadata => {
    console.log("onEvent", rawMetadata);
    try {
      const metadata: Metadata = JSON.parse(rawMetadata.content);
      const metaPubkey = rawMetadata.pubkey;
      console.log("onEvent", metaPubkey, metadata);

      if (metadata) {
        setFetchedProfiles((_profiles: Record<string, Metadata>) => {
          return {
            ..._profiles,
            [metaPubkey]: metadata,
          };
        });
      }
    } catch (err) {
      console.error(err, rawMetadata);
    }
  }); */

  const loadProfile = async (pubkey: string) => {
    try {
      const result = await relay.list([{ kinds: [0], authors: [pubkey] }]);
      const parsedResult = JSON.parse(result[0].content);
      if (result && result[0] && result[0].content) {
        return parsedResult;
      } else {
        console.warn("Nessun profilo trovato o dati non validi per la chiave:", pubkey);
        return null; // Restituisci null se non ci sono dati validi
      }
    } catch (error) {
      console.error("Errore nel caricamento del profilo:", error);
      return null; // Gestisci l'errore restituendo null o un valore di default
    }
  };

  useEffect(() => {
    setRequestedPubkeys(_pubkeys => {
      return [..._pubkeys, ...pubkeysToFetch].filter(uniqValues);
    });
    const run = async () => {
      for (const pubkey of pubkeysToFetch) {
        await loadProfile(pubkey).then(data => {
          setFetchedProfiles(prev => ({
            ...prev,
            [pubkey]: data,
          }));
        });
      }

      setNpub(nip19.npubEncode(pubkey));
      setMetadata(fetchedProfiles[pubkey]);
    };
    if (enabled) {
      run();
    }
  }, [pubkey, enabled]);

  return {
    data: fetchedProfiles[pubkey]
      ? {
          ...fetchedProfiles[pubkey],
          npub,
        }
      : undefined,
  };
}
