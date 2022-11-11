import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import * as app from "../wailsjs/go/main/App";
import { setConfig } from "./config";

async function main() {
    const container = document.getElementById("root");
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.className = "sl-theme-dark";

    setConfig(await app.GetConfig());
    const root = createRoot(container!); // eslint-disable-line

    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );

    console.log("load main");
}

main();
