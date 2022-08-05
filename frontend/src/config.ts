import { main } from "./api";

export let config: main.Config = main.Config.createFrom();

export function setConfig(newConfig: main.Config) {
    config = newConfig;
}
