import { useState } from "react";
import FirstStage from "./modules/FirstStage";

export default function App() {
    const [started, setStarted] = useState(false);

    if (started) {
        return <FirstStage />;
    }

    return (
        <>
            {" "}
            <div className="w-full h-screen flex flex-col items-center justify-center">
                <button
                    className="btn btn-primary btn-xs sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl"
                    onClick={() => setStarted(true)}
                >
                    Start Test
                </button>
            </div>
        </>
    );
}
