import { FlowbyteClient, type TokenStorage } from "@flowbyte/api-client";
import type { AuthTokens, User } from "@flowbyte/types";
import { defaultApiUrl, normalizeApiUrl } from "@flowbyte/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  tokens: "flowbyte.tokens",
  apiUrl: "flowbyte.apiUrl",
  deviceId: "flowbyte.deviceId",
};

const tokenStorage: TokenStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    const raw = await AsyncStorage.getItem(KEYS.tokens);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  },
  async setTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.tokens);
  },
};

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.deviceId);
  if (existing) return existing;
  const id = `fb-mobile-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEYS.deviceId, id);
  return id;
}

export async function getApiUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(KEYS.apiUrl);
  return normalizeApiUrl(stored ?? defaultApiUrl());
}

export async function setApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.apiUrl, normalizeApiUrl(url));
  client = await createClient();
}

export let client: FlowbyteClient | null = null;

export async function createClient(): Promise<FlowbyteClient> {
  const deviceId = await getDeviceId();
  return new FlowbyteClient({
    baseUrl: await getApiUrl(),
    tokenStorage,
    platform: "mobile",
    deviceName: `flowbyte-mobile-${deviceId.slice(-6)}`,
  });
}

export async function initApiClient(): Promise<void> {
  if (!client) client = await createClient();
}

/** True when the user is signed in (refresh token present). */
export async function isSignedIn(): Promise<boolean> {
  const tokens = await tokenStorage.getTokens();
  return !!tokens?.refreshToken;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return (await client?.me()) ?? null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await client?.logout();
  } catch {
    await tokenStorage.clear();
  }
}