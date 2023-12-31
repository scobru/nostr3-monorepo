import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useWalletClient } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const Claim: NextPage = () => {
  const [claimValue, setClaimValue] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: signer } = useWalletClient();

  const { writeAsync: withdraw } = useScaffoldContractWrite({
    contractName: "Nostr3",
    functionName: "withdraw",
    args: [claimValue],
  });

  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const handleSubmit = () => {
    console.log("Claim Value:", claimValue);
    withdraw();
    setIsModalOpen(false); // Chiudi il modal dopo il submit
  };

  return (
    <div className="flex flex-col mx-auto w-3/6 items-center justify-center">
      <dialog open={isModalOpen} className="modal bg-gradient-to-br from-secondary  to-slate-900">
        <div className="modal-box shadow-base-300 shadow-xl">
          <div className="flex flex-col font-black text-4xl mb-8 mx-auto items-center justify-center">nostr3</div>
          {signer ? (
            <div className="text-center">
              <input
                type="text"
                value={claimValue}
                onChange={e => setClaimValue(e.target.value)}
                className="input input-primary w-full mb-4"
                placeholder="Insert Key"
              />
              <button className="btn btn-primary mt-4 text-center" onClick={handleSubmit}>
                Claim
              </button>
              <div className="modal-action">
                <button className="btn" onClick={() => setIsModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col mx-auto">
              <RainbowKitCustomConnectButton />
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
};

export default Claim;
