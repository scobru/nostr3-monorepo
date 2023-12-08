import React, { useEffect, useState } from "react";
import { Nostr3 } from "@scobru/nostr3/dist/nostr3";
import { Event, Filter } from "nostr-tools";
import { useGlobalState } from "~~/services/store/store";

const MessagesCard = ({ relay }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const privateKey = useGlobalState(state => state.nostrKeys.sec);
  const publicKey = useGlobalState(state => state.nostrKeys.pub);

  const nostr3 = new Nostr3(privateKey);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const uniqueUsers = new Set(events.map(event => event.pubkey));
    setUsers(Array.from(uniqueUsers));
  }, [events]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (events.lenght == 0) {
        const events = await relay?.list([{ kinds: [4] }]);
        const filteredEvents = events?.filter(event => {
          return (event.tags && event.tags[0][0] == "p" && event.tags[0][1] == publicKey) || event.pubkey == publicKey;
        });
        console.log(filteredEvents);
        setEvents(filteredEvents as any);
      }
    };
    fetchEvents();
  }, [relay, publicKey, events]);

  useEffect(() => {
    if (selectedUser) {
      const filteredEvents = events.filter(event => event.pubkey === selectedUser);
      setMessages(filteredEvents);
    }
  }, [selectedUser, events]);

  useEffect(() => {
    const decryptMessages = async () => {
      const decryptedMessages = await Promise.all(
        messages.map(async message => {
          if (message.kind === 4) {
            const decryptedContent = await runDecryptContent(message.content, privateKey);
            return { ...message, content: decryptedContent };
          }
          return message;
        }),
      );
      setMessages(decryptedMessages);
    };

    if (messages.some(message => message.kind === 4)) {
      decryptMessages();
    }
  }, [messages, privateKey]);

  const runDecryptContent = async (encryptedContent, decryptionKey) => {
    try {
      const decryptedContent = await nostr3.decryptDM(encryptedContent, decryptionKey);
      return decryptedContent;
    } catch (error) {
      console.error("Error decrypting content:", error);
      return null;
    }
  };

  const selectUser = userPubKey => {
    setSelectedUser(userPubKey);
  };

  const sendMessage = (content, userPubKey) => {
    // Implement message sending logic
  };

  return (
    <div className="chat-ui-container">
      <div className="user-list">
        {users.map(userPubKey => (
          <button key={userPubKey} onClick={() => selectUser(userPubKey)}>
            {userPubKey}
          </button>
        ))}
      </div>
      <div className="chat-tabs">
        {selectedUser && (
          <div>
            <div>Chat with {selectedUser}</div>
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index}>{message.content}</div>
              ))}
            </div>
            <input type="text" placeholder="Type a message..." />
            <button onClick={() => sendMessage()}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesCard;
