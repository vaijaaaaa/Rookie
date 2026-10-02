/** Only follow in-app relative links (e.g. stored on notifications); rejects absolute and protocol-relative URLs. */
export function safeLink(link: string | null | undefined): string | null {
  return link && link.startsWith("/") && !link.startsWith("//") && !link.startsWith("/\\") ? link : null;
}
