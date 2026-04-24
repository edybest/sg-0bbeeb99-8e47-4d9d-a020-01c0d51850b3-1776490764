const BIOMETRIC_CONFIG_KEY = "ambc_biometric_unlock";

export interface TrustedDeviceConfig {
  credentialId: string;
  enabled: boolean;
  userId: string;
  username: string;
  createdAt: string;
}

function isBrowserReady() {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function getConfig(): TrustedDeviceConfig | null {
  if (!isBrowserReady()) return null;

  try {
    const raw = localStorage.getItem(BIOMETRIC_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrustedDeviceConfig;
  } catch {
    return null;
  }
}

function setConfig(config: TrustedDeviceConfig) {
  if (!isBrowserReady()) return;
  localStorage.setItem(BIOMETRIC_CONFIG_KEY, JSON.stringify(config));
}

function clearConfig() {
  if (!isBrowserReady()) return;
  localStorage.removeItem(BIOMETRIC_CONFIG_KEY);
}

async function platformAuthenticatorAvailable() {
  if (!isBrowserReady() || typeof PublicKeyCredential === "undefined") {
    return false;
  }

  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    return false;
  }

  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

async function createCredential(userId: string, username: string) {
  const challenge = randomBytes(32);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "AMBC CLUB",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Pendaftaran thumbprint tidak berjaya.");
  }

  return encodeBase64Url(new Uint8Array(credential.rawId));
}

async function getAssertion(credentialId: string) {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          id: decodeBase64Url(credentialId),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("Pengesahan thumbprint gagal.");
  }

  return assertion;
}

export const biometricAuthService = {
  async isSupported() {
    return platformAuthenticatorAvailable();
  },

  getTrustedDeviceConfig() {
    return getConfig();
  },

  isEnabledForUser(userId?: string | null) {
    const config = getConfig();
    if (!config?.enabled) return false;
    if (!userId) return true;
    return config.userId === userId;
  },

  async enableTrustedDevice(userId: string, username: string) {
    if (!(await platformAuthenticatorAvailable())) {
      throw new Error("Thumbprint tidak disokong pada device ini.");
    }

    const credentialId = await createCredential(userId, username);

    const config: TrustedDeviceConfig = {
      credentialId,
      enabled: true,
      userId,
      username,
      createdAt: new Date().toISOString(),
    };

    setConfig(config);
    return config;
  },

  async verifyTrustedDevice(userId?: string | null) {
    const config = getConfig();

    if (!config?.enabled) {
      throw new Error("Thumbprint belum diaktifkan pada device ini.");
    }

    if (userId && config.userId !== userId) {
      throw new Error("Thumbprint ini bukan untuk akaun semasa.");
    }

    await getAssertion(config.credentialId);
    return true;
  },

  disableTrustedDevice() {
    clearConfig();
  },
};