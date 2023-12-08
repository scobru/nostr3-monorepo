import React, { useEffect, useState } from "react";
import axios from "axios";
import { Filter } from "nostr-tools";
import { LazyLoadImage } from "react-lazy-load-image-component";

interface TrendingProfilesProps {
  getEvents: (filters: Filter[]) => void;
}

const TrendingProfiles = (props: TrendingProfilesProps) => {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const fetchTrendingProfiles = async () => {
      setIsLoading(true);
      try {
        // Hypothetical endpoint - replace with the actual endpoint if available
        const response = await axios.get("https://api.nostr.band/v0/trending/profiles");
        setProfiles(response.data.profiles);
        const response2 = await axios.get("https://api.nostr.band/v0/trending/notes");
        setNotes(response2.data.notes);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingProfiles();
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="flex flex-col w-64 p-4 shadow-lg ">
      <h2 className="text-xl font-semibold mb-4">Trending Profiles</h2>
      <div>
        {profiles.length > 0 &&
          profiles.slice(0, 10).map((profile: any) => {
            const profileData = JSON.parse(profile?.profile?.content);
            const name = profileData?.name || "Unnamed Profile";
            const picture = profileData?.picture || "default-picture-url";

            return (
              <button
                key={profile?.pubkey}
                className="flex items-center mb-3"
                onClick={() => {
                  props.getEvents([
                    {
                      authors: [profile.pubkey],
                      kinds: [1],
                      limit: 10,
                    },
                  ]);
                }}
              >
                <LazyLoadImage src={picture} alt={name} className="w-10 h-10 rounded-full mr-3" />
                <h3 className="text-md font-medium">{name}</h3>
              </button>
            );
          })}
      </div>
      <h2 className="text-xl font-semibold mb-4">Trending Notes</h2>
      <div>
        {notes.length > 0 &&
          notes.slice(0, 5).map((note: any) => {
            const name = JSON.parse(note.author.content).name || "Unnamed Profile";
            const picture = JSON.parse(note.author.content).picture || "default-picture-url";
            const content = note.event.content;
            return (
              <button
                key={note.pubkey}
                className="flex items-center mb-3"
                onClick={() => {
                  const filter: Filter[] = [
                    {
                      ids: [note.id],
                    },
                  ];
                  props.getEvents(filter);
                }}
              >
                <LazyLoadImage src={picture} alt={name} className="w-10 h-10 rounded-full mr-3" />
                <h3 className="text-md font-medium">{content.slice(0, 50)}</h3>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default TrendingProfiles;
