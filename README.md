# NOSTR3

Nostr3 is here to make your life easier when dealing with the Nostr protocol! It cleverly generates private keys right from your EVM address, taking the hassle out of key storage.

Nost3 aims to extend the capabilities of the Nostr protocol by incorporating Web3 payment functionalities. This integration allows users to generate a Nostr keypair by signing a signature through their wallet. Along with this keypair, an Ethereum Virtual Machine (EVM) address will be created.

## How It Works

1. **Signature Signing:** Users sign a signature using their wallet to initiate the keypair generation process.

2. **Keypair Generation:** A Nostr keypair is generated, alongside an EVM address.

3. **Database Registration:** Users register their EVM address in the Nostr3 database, linking it to their Nostr protocol public key.

4. **Tip Transactions:** Once registered, users can engage in tip transactions with other Nostr users who have also registered on Nostr3.

## Benefits

- **Enhanced Functionality:** By bridging Nostr with Web3, users enjoy a broader range of payment options and interactions.
  
- **User-Friendly:** The process is designed to be straightforward, catering to both beginners and experienced users in the blockchain space.

## Packages

we build nostr3 npm package to provide the signature used to generate the keypair, you can find the reppo here <https://github.com/scobru/nostr3> or you can install

    npm install @scobru/nostr3

we use mogu to store data over IPFS <https://github.com/scobru/mogu>

    npm isntall @scobru/mogu

## NIPS

- NIP-111 : <https://github.com/nostr-protocol/nips/pull/268>

## API Section

In addition to the existing features, Nostr3 introduces a convenient API functionality. This feature allows you to fetch an Ethereum Virtual Machine (EVM) address that corresponds to a specific Nostr public key (npub address).

You can easily access this API using the following endpoint:

`https://nostr3.vercel.app/api/npub123XYZ`

By querying this endpoint with a Nostr public key, you will receive a response containing two key pieces of information:

- **`evmAddress`**: This is the corresponding EVM address linked to the provided Nostr public key.
- **`pubKey`**: The original Nostr public key used in the query.

This API feature enhances the interoperability between Nostr protocol and EVM-based systems, making it easier for users to manage their identities and transactions across different blockchain platforms.

## Quick and Efficient Tipping Through URL Links

The core of this feature lies in its ability to translate simple URL links into actionable tipping transactions. By integrating this feature:

- **Applications can generate URLs** that represent tipping actions. These URLs carry the necessary information, such as the Nostr public key (npub) of the recipient and the note ID (nnote), to facilitate a tip.

- **Users visiting these URLs** are directed to a tipping page, where they can easily send tips by connecting their Web3 wallets. This process reduces the complexity typically associated with cryptocurrency transactions.

## Enabling Interoperability

This tipping feature exemplifies Nostr3's commitment to interoperability within the blockchain space. It allows various applications, including those outside the Nostr ecosystem, to incorporate seamless tipping functionalities, thus widening the reach and usability of the Nostr protocol.

## Use Case in External Applications

External applications can utilize this feature by embedding Nostr3 tipping URLs within their platforms. Users can then engage in tipping with a single click, navigating to the Nostr3 interface to complete their transactions.

### Example

A blog platform can include Nostr3 tipping URLs next to each blog post. Readers can tip authors by simply clicking these links, making the appreciation process straightforward and engaging.

For example, a tipping URL might look like this:

`https://nostr3.vercel.app/tip/npub1abcd1234/note12345abcd`

This URL represents a tip to the user with the public key `npub1abcd1234` and the specific note ID `note12345abcd`.

In the example URL:

/tip/npub1abcd1234/note12345abcd is a path where npub1abcd1234 is the Nostr public key of the recipient, and note12345abcd is an optional note ID for additional context or linking to a specific content item.
Make sure to replace the example domain and paths with actual values based on your application's URL structure and user identifiers.

## Requirement for Receiving Tips: EVM Address Registration

For a Nostr public key (pubkey) to receive tips, it must have a registered Ethereum Virtual Machine (EVM) address in Nostr3. This registration is crucial as it links the Nostr pubkey to an EVM address capable of receiving tips.

### Registering for Tips

- **Linking EVM Address**: Users need to register their EVM address with their Nostr pubkey within the Nostr3 platform. This step ensures that the tips sent to a Nostr pubkey are correctly transferred to the user's EVM address.

- **Enabling Seamless Transactions**: By linking the Nostr pubkey with an EVM address, Nostr3 facilitates seamless transactions, allowing users to receive tips directly in their preferred cryptocurrency wallet.

### How to Register

1. **Access Nostr3 Platform**: Users need to log in to the Nostr3 platform.
2. **Provide EVM Address**: Users submit or generate their EVM address on the platform, linking it to their Nostr public key.
3. **Confirmation**: Once registered, the platform confirms the linkage, enabling the Nostr public key to receive tips directly to the linked EVM address.

This registration process ensures that tips are securely and efficiently processed, enhancing the user experience within the Nostr ecosystem.

## Tipping Users Not Registered on Nostr3

In addition to sending tips to registered users, Nostr3 allows tipping to users who haven't linked their EVM addresses. This is done by depositing the tip into a contract associated with a unique passkey.

### Sending a Tip to Non-Registered Users

1. **Tip Deposit**: The tip is deposited into a smart contract tied to a unique passkey.
2. **Encrypted Message**: This passkey is sent in an encrypted private message to the recipient over Nostr.
3. **Claiming the Tip**: The recipient visits the `/claim` page, enters the passkey, connects their wallet, and retrieves the tip.

This feature ensures that users can send and receive tips regardless of registration status, expanding the usability of Nostr3 within the Nostr ecosystem.

## How to Claim Tips (Registered and Non-Registered Users)

### For Registered Users

- **Direct Transfer**: Tips are directly transferred to the linked EVM wallet.

### For Non-Registered Users

1. **Receive Encrypted Message**: An encrypted message with a unique passkey is received via Nostr.
2. **Visit Claim Page**: Navigate to `https://nostr3.vercel.app/claim`.
3. **Enter Passkey**: Input the provided passkey.
4. **Connect Wallet**: Connect your Web3 wallet.
5. **Retrieve Tip**: Approve the transaction to claim your tip.

This process ensures a smooth and secure method for all users to participate in tipping transactions, enhancing Nostr3's functionality.

---

## Key Features

- **Keypair and EVM Address Generation**: Generate a Nostr keypair and an EVM address using your wallet.
- **Database Registration**: Link your EVM address with your Nostr public key for streamlined transactions.
- **Flexible Tipping Mechanism**: Send and receive tips easily, whether registered on Nostr3 or not.
- **Enhanced User Experience**: Both registered and non-registered users can seamlessly engage in tip transactions.

## Additional Information

For more details on packages, API usage, and NIPs, please refer to the earlier sections of this README.

---
