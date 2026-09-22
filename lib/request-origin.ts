const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

export function resolveAppOrigin(
  configuredAppUrl: string,
  requestOrigin: string | null,
): string {
  const configured = new URL(configuredAppUrl)
  if (!requestOrigin) return configured.origin

  try {
    const candidate = new URL(requestOrigin)
    if (candidate.origin === configured.origin) return candidate.origin

    const isLocalAlias =
      LOCAL_HOSTS.has(configured.hostname) &&
      LOCAL_HOSTS.has(candidate.hostname) &&
      candidate.port === configured.port &&
      ["http:", "https:"].includes(candidate.protocol)

    return isLocalAlias ? candidate.origin : configured.origin
  } catch {
    return configured.origin
  }
}
