# NOSTR3

Nostr3 is here to make your life easier when dealing with the Nostr protocol! It cleverly generates private keys right from your EVM address, taking the hassle out of key storage.

Need your keys?
Just a quick interaction with Nostr3, and you are all set.
What's more, it links your Nostr accounts to your EVM accounts, making tipping a breeze for all Nostr accounts set up through Nostr3.
For the best Nostr experience, we suggest pairing it with open-source clients. Happy Nostring!

Nost3 aims to extend the capabilities of the Nostr protocol by incorporating Web3 payment functionalities. This integration allows users to generate a Nostr keypair by signing a signature through their wallet. Along with this keypair, an Ethereum Virtual Machine (EVM) address will be created.

## PACKAGES

    we build nostr3 npm package to provide the signature used to generate the keypair, you can find the reppo here https://github.com/scobru/nostr3 or you can install @scobru/nostr3.

## NIPS

    - NIP-111 : https://github.com/nostr-protocol/nips/pull/268

## Key Features

- **Keypair and EVM Address Generation:** Users can generate a Nostr keypair and an associated EVM address through their wallet.
  
- **Database Registration:** The generated EVM address can be registered in the Nostr3 database. This process links it to the user's public key within the Nostr protocol.
  
- **Sending and Receiving Tips:** Users can send and receive tips to and from all public keys associated with Nostr users who have registered their addresses on Nostr3.

## How It Works

1. **Signature Signing:** Users sign a signature using their wallet to initiate the keypair generation process.

2. **Keypair Generation:** A Nostr keypair is generated, alongside an EVM address.

3. **Database Registration:** Users register their EVM address in the Nostr3 database, linking it to their Nostr protocol public key.

4. **Tip Transactions:** Once registered, users can engage in tip transactions with other Nostr users who have also registered on Nostr3.

## Benefits

- **Enhanced Functionality:** By bridging Nostr with Web3, users enjoy a broader range of payment options and interactions.
  
- **User-Friendly:** The process is designed to be straightforward, catering to both beginners and experienced users in the blockchain space.
