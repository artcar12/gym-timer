/**
 * Save `text` as a file: a Blob URL on a temporary anchor with `download`,
 * clicked, then removed. The URL is revoked after {@link REVOKE_DELAY_MS}:
 * some WebKit versions cancel a download whose URL is revoked at once.
 */
export const REVOKE_DELAY_MS = 1_000

export function downloadText(
  filename: string,
  text: string,
  type = 'application/json',
): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  try {
    a.click()
  } finally {
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
  }
}
