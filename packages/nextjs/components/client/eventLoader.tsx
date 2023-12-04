import { SpinnerDiamond } from "spinners-react";

export default function EventLoader() {
  return (
    <div className="w-full py-5 rounded-lg shadow border-dashed border-primary">
      <div className="flex flex-col space-y-10">
        <span className="text-2xl font-bold ">Loading Events...</span>
        <SpinnerDiamond className="mx-auto text-green-300" size={100} color="#86EFAC" />
      </div>
    </div>
  );
}
