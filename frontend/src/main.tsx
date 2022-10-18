import React from "react";
import { createRoot } from "react-dom/client";

//import "98.css";
//import "./midnight-green.css";
//import "./classless.css";
//import "./classless-themes.css";

import App from "./App";
import * as app from "../wailsjs/go/main/App";
import { setConfig } from "./config";

async function main() {
    const container = document.getElementById("root");
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.className = "sl-theme-dark";

    setConfig(await app.GetConfig());
    const root = createRoot(container!);

    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );

    console.log("load main");
}

main();
