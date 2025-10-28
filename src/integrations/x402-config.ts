import { z } from 'zod';
import { getSetting, setSetting } from '../store/settings';
import { encryptJSON, decryptJSON } from '../security/crypto';

const KEY = 'X402_CONFIG_ENC';

const X402ConfigSchema = z.object({
  facilitatorUrl: z.string().url(),
  walletAddress: z.string().min(6),
  apiKeyId: z.string().min(8),
  apiKeySecret: z.string().min(16),
});

export type X402Config = z.infer<typeof X402ConfigSchema>;

const mask = (value: string) => {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 4)}••••`;
};

export function saveX402Config(config: unknown) {
  const parsed = X402ConfigSchema.parse({
    facilitatorUrl:
      (config as Record<string, unknown>)?.facilitatorUrl ??
      'https://x402.org/facilitator',
    walletAddress: (config as Record<string, unknown>)?.walletAddress,
    apiKeyId: (config as Record<string, unknown>)?.apiKeyId,
    apiKeySecret: (config as Record<string, unknown>)?.apiKeySecret,
  });
  const encrypted = encryptJSON(parsed);
  setSetting(KEY, encrypted);
}

export function readX402Config(redact = true) {
  const encrypted = getSetting(KEY);
  if (!encrypted) return null;
  const config = decryptJSON(encrypted) as X402Config;
  if (!redact) return config;
  return {
    facilitatorUrl: config.facilitatorUrl,
    walletAddress: config.walletAddress,
    apiKeyId: mask(config.apiKeyId),
    apiKeySecret: mask(config.apiKeySecret),
    configured: true,
  };
}
