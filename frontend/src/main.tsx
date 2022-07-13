import React from "react";
import { createRoot } from "react-dom/client";

//import "normalize.css";
import "./water-dark.css";
//import "98.css";
//import "./midnight-green.css";
//import "./classless.css";
//import "./classless-themes.css";
import "./style.css";
import App from "./App";

const container = document.getElementById("root");
document.documentElement.setAttribute("data-theme", "dark");

const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

console.log("load main");
