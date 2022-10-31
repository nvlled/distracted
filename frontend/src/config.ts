import { main } from "./api";

let _config: main.Config = main.Config.createFrom();

export function config() {
    return _config;
}

export function setConfig(newConfig: main.Config) {
    _config = newConfig;
}
