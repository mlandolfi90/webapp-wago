import { LS_KEY } from "../constants.js";

const state = {
  apikey: localStorage.getItem(LS_KEY) || "",
  instances: []
};

export function getApiKey() {
  return state.apikey;
}

export function setApiKey(key) {
  state.apikey = key;
  localStorage.setItem(LS_KEY, key);
}

export function clearApiKey() {
  state.apikey = "";
  localStorage.removeItem(LS_KEY);
}

export function setInstances(list) {
  state.instances = list || [];
}

export function getInstances() {
  return state.instances;
}
