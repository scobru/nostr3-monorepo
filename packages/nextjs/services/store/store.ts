import create from "zustand";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type TGlobalState = {
  nativeCurrencyPrice: number;
  setNativeCurrencyPrice: (newNativeCurrencyPriceState: number) => void;
  nostrKeys: any;
  setNostrKeys: (newNostrKeys: any) => void;
  nostr3List: any;
  setNostr3List: (newNostr3List: any) => void;
  eventId: string;
  setEventId: (newEventId: string) => void;
};

export const useGlobalState = create<TGlobalState>(set => ({
  nativeCurrencyPrice: 0,
  setNativeCurrencyPrice: (newValue: number): void => set(() => ({ nativeCurrencyPrice: newValue })),
  nostrKeys: {},
  setNostrKeys: (newNostrKeys: any): void => set(() => ({ nostrKeys: newNostrKeys })),
  nostr3List: "",
  setNostr3List: (newNostr3List: any): void => set(() => ({ nostr3List: newNostr3List })),
  eventId: "",
  setEventId: (newEventId: string): void => set(() => ({ eventId: newEventId })),
}));
