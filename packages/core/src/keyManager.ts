// ─── Types ────────────────────────────────────────────────────────────────────

export type KeyFailureReason = "rate_limited" | "out_of_credits" | "invalid" | "server_error" | "network";

interface KeyState {
  key: string;
  /** Masked version for display */
  masked: string;
  /** Epoch ms — 0 means not on cooldown */
  cooldownUntil: number;
  /** If true, permanently skip this key until process restart */
  disabled: boolean;
  /** How many times this key has been used */
  requests: number;
  /** How many times this key has failed */
  failures: number;
  /** Last failure reason */
  lastFailure?: KeyFailureReason;
  /** When we last successfully used this key */
  lastSuccess?: number;
}

function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

// ─── KeyManager ───────────────────────────────────────────────────────────────

/**
 * Rotates across a list of OpenRouter API keys with full error tracking.
 *
 * Features:
 *   - Automatic rotation on 429 (rate-limit), 402 (credits), 401 (invalid)
 *   - Respects retry-after headers for precise cooldown timing
 *   - Exponential backoff: each successive failure multiplies cooldown
 *   - Per-key stats (requests, failures, last success)
 *   - Permanently disables invalid keys for the session
 *   - Falls back to the soonest-available key if all are cooling
 *   - Rich status dashboard for CLI and Desktop sidebar
 */
export class KeyManager {
  private keys: KeyState[];
  private cursor = 0;

  constructor(rawKeys: string[]) {
    if (rawKeys.length === 0) {
      throw new Error("No API keys found. Add at least one key to ~/.nadar-code/keys.txt");
    }
    this.keys = rawKeys.map((key) => ({
      key,
      masked: maskKey(key),
      cooldownUntil: 0,
      disabled: false,
      requests: 0,
      failures: 0,
    }));
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get totalKeys(): number { return this.keys.length; }
  get activeIndex(): number { return this.cursor; }

  keyCount(): number { return this.keys.length; }

  private usable(state: KeyState): boolean {
    return !state.disabled && state.cooldownUntil <= Date.now();
  }

  /**
   * Returns the current usable key. Automatically skips disabled or
   * cooling-down keys. Falls back to the key with the soonest cooldown
   * expiry if every key is unavailable.
   */
  current(): string {
    const start = this.cursor;

    // Find next usable key
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (start + i) % this.keys.length;
      if (this.usable(this.keys[idx])) {
        this.cursor = idx;
        this.keys[idx].requests++;
        return this.keys[idx].key;
      }
    }

    // All cooling — use the one with the soonest expiry as a last resort
    const soonest = [...this.keys]
      .filter(k => !k.disabled)
      .sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];

    if (!soonest) {
      const first = this.keys[0];
      first.requests++;
      return first.key;
    }

    soonest.requests++;
    return soonest.key;
  }

  /**
   * Mark a key as rate-limited. Uses the retry-after header value when
   * provided. Each repeated failure doubles the base cooldown (exponential
   * backoff), plus a small random jitter to prevent thundering herd.
   */
  markLimited(key: string, cooldownSeconds = 30): void {
    const state = this.keys.find((k) => k.key === key);
    if (state) {
      state.failures++;
      state.lastFailure = "rate_limited";
      // Exponential backoff: 2^(failures-1) * base, capped at 1 hour
      const backoff = Math.min(
        cooldownSeconds * Math.pow(2, state.failures - 1),
        3600
      );
      // Add jitter: ±10% to desynchronise multiple keys coming off cooldown
      const jitter = backoff * 0.1 * (Math.random() * 2 - 1);
      state.cooldownUntil = Date.now() + (backoff + jitter) * 1000;
    }
    this.advance();
  }

  /**
   * Mark a key as out of credits (402). Puts it on a long cooldown
   * rather than disabling it, in case the account is topped up later.
   */
  markOutOfCredits(key: string): void {
    const state = this.keys.find((k) => k.key === key);
    if (state) {
      state.failures++;
      state.lastFailure = "out_of_credits";
      state.cooldownUntil = Date.now() + 24 * 3600 * 1000; // 24h
    }
    this.advance();
  }

  /**
   * Permanently disable a key for this session (e.g. 401 Invalid).
   */
  markInvalid(key: string): void {
    const state = this.keys.find((k) => k.key === key);
    if (state) {
      state.disabled = true;
      state.failures++;
      state.lastFailure = "invalid";
    }
    this.advance();
  }

  /**
   * Mark a key as having experienced a server-side error (5xx).
   * Short cooldown — server might recover quickly.
   */
  markServerError(key: string): void {
    const state = this.keys.find((k) => k.key === key);
    if (state) {
      state.failures++;
      state.lastFailure = "server_error";
      const cooldown = Math.min(10 * Math.pow(2, state.failures - 1), 120);
      state.cooldownUntil = Date.now() + cooldown * 1000;
    }
    this.advance();
  }

  /**
   * Called after a successful API call. Resets failure count so backoff
   * clears once a key recovers.
   */
  markSuccess(key: string): void {
    const state = this.keys.find((k) => k.key === key);
    if (state) {
      state.failures = 0;
      state.lastFailure = undefined;
      state.lastSuccess = Date.now();
      state.cooldownUntil = 0;
    }
  }

  allExhausted(): boolean {
    return this.keys.every((k) => !this.usable(k));
  }

  private advance(): void {
    const start = (this.cursor + 1) % this.keys.length;
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (start + i) % this.keys.length;
      if (this.usable(this.keys[idx])) {
        this.cursor = idx;
        return;
      }
    }
    // No usable key found; just increment cursor for next attempt
    this.cursor = (this.cursor + 1) % this.keys.length;
  }

  // ── Status dashboard ───────────────────────────────────────────────────────

  status(): string {
    const now = Date.now();
    return this.keys
      .map((k, i) => {
        const arrow = i === this.cursor ? "->" : "  ";
        let stateStr: string;
        if (k.disabled) {
          stateStr = "✗ disabled (invalid key)";
        } else if (k.cooldownUntil > now) {
          const secsLeft = Math.ceil((k.cooldownUntil - now) / 1000);
          stateStr = `⏳ cooling (${secsLeft}s) — last: ${k.lastFailure ?? "?"}`;
        } else {
          stateStr = k.lastSuccess
            ? `✓ ready — last ok ${Math.round((now - k.lastSuccess) / 1000)}s ago`
            : "✓ ready";
        }
        return `${arrow} [${i}] ${k.masked}   req:${k.requests} fail:${k.failures}   ${stateStr}`;
      })
      .join("\n");
  }

  /** Structured data for the Desktop sidebar */
  statusData(): {
    index: number;
    masked: string;
    ready: boolean;
    disabled: boolean;
    cooldownSecs: number;
    requests: number;
    failures: number;
    lastFailure?: KeyFailureReason;
    isCurrent: boolean;
  }[] {
    const now = Date.now();
    return this.keys.map((k, i) => ({
      index: i,
      masked: k.masked,
      ready: this.usable(k),
      disabled: k.disabled,
      cooldownSecs: k.cooldownUntil > now ? Math.ceil((k.cooldownUntil - now) / 1000) : 0,
      requests: k.requests,
      failures: k.failures,
      lastFailure: k.lastFailure,
      isCurrent: i === this.cursor,
    }));
  }
}
