/**
 * Crude HTML → plain-text conversion for Mastodon-rendered bodies
 * (`Status.content`, `Announcement.content`, `Account.note`).
 *
 * `<br>` → newline, `</p><p>` → blank line between paragraphs, then drop
 * the remaining tags and decode the entities that mastodon-server output
 * uses in practice (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`).
 *
 * Placeholder until the renderer understands mention / hashtag / url
 * spans and Mastodon custom emoji. Until that lands, links collapse to
 * their display text (mastodon servers shorten URLs into a friendly form
 * before embedding), which is the best a flat string can do without
 * losing information.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
