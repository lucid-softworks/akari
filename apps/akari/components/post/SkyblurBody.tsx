import React, { useMemo, useState } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { openExternalLink } from '@/utils/externalLink';

type SkyblurBodyProps = {
  /**
   * Full Skyblur source text, with originally-redacted words wrapped in
   * `[brackets]` (e.g. `my favourite colour is [red].`).
   */
  text: string;
  /** Optional style override for the body Text. */
  textStyle?: StyleProp<TextStyle>;
  /**
   * When set, tapping a redacted token opens this URL instead of
   * revealing the inline word. Used for encrypted (password-visibility)
   * Skyblur posts where the local `text` field only has empty `[]`
   * placeholders and the real body lives in an `encryptBody` blob —
   * we can't decrypt locally, so deep-link out to skyblur.uk.
   */
  forwardUrl?: string;
};

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'blur'; value: string };

/**
 * Splits Skyblur source text into alternating plain-text and bracketed
 * segments. We use a single-pass scan rather than `String.split(/\[…\]/)`
 * so we keep the original ordering and the bracketed contents in one go.
 */
function tokenise(text: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('[', i);
    if (open === -1) {
      out.push({ kind: 'text', value: text.slice(i) });
      break;
    }
    if (open > i) out.push({ kind: 'text', value: text.slice(i, open) });
    const close = text.indexOf(']', open + 1);
    if (close === -1) {
      // Unterminated bracket — treat the rest as plain text so we
      // don't lose characters.
      out.push({ kind: 'text', value: text.slice(open) });
      break;
    }
    const inner = text.slice(open + 1, close);
    if (inner.length === 0) {
      // Empty `[]` — keep verbatim rather than rendering an invisible
      // reveal target.
      out.push({ kind: 'text', value: '[]' });
    } else {
      out.push({ kind: 'blur', value: inner });
    }
    i = close + 1;
  }
  return out;
}

/**
 * Per-bracket reveal token. Starts blurred (rendered as `••••` of the
 * same length as the source word) and switches to the underlying text
 * on tap. Each token tracks its own reveal state so multiple redactions
 * in the same post can be revealed independently.
 *
 * If `forwardUrl` is set the token opens that URL instead of revealing
 * — used for encrypted Skyblur posts whose local content we can't
 * decrypt.
 */
function BlurToken({
  word,
  textStyle,
  forwardUrl,
}: {
  word: string;
  textStyle?: StyleProp<TextStyle>;
  forwardUrl?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const accent = useThemeColor({}, 'tint');
  const placeholder = '•'.repeat(Math.max(2, word.length));
  const isForward = !!forwardUrl;
  const handlePress = () => {
    if (isForward && forwardUrl) {
      void openExternalLink(forwardUrl);
      return;
    }
    setRevealed((r) => !r);
  };
  return (
    <ThemedText
      onPress={handlePress}
      style={[textStyle, styles.token, revealed ? null : { color: accent }]}
      accessibilityRole="link"
      accessibilityLabel={
        isForward
          ? 'tap to open the encrypted post on skyblur.uk'
          : revealed
            ? word
            : 'tap to reveal redacted word'
      }
      accessibilityState={{ expanded: revealed }}
    >
      {revealed && !isForward ? word : placeholder}
    </ThemedText>
  );
}

/**
 * Renders the de-redacted Skyblur source text. Each `[bracketed]` chunk
 * becomes an individually-tappable reveal token; everything else is
 * regular themed text. Wraps as a single paragraph so the in-line tokens
 * flow with the surrounding prose just like the public masked version
 * would.
 */
export function SkyblurBody({ text, textStyle, forwardUrl }: SkyblurBodyProps) {
  const segments = useMemo(() => tokenise(text), [text]);
  return (
    <ThemedText style={textStyle}>
      {segments.map((segment, i) => {
        if (segment.kind === 'text') {
          // oxlint-disable-next-line react/no-array-index-key -- segments are positional and the array has no stable identity beyond index
          return <React.Fragment key={`t-${i}`}>{segment.value}</React.Fragment>;
        }
        return (
          <BlurToken
            // oxlint-disable-next-line react/no-array-index-key -- same as above
            key={`b-${i}`}
            word={segment.value}
            textStyle={textStyle}
            forwardUrl={forwardUrl}
          />
        );
      })}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  token: {
    // RN doesn't have a direct "rounded inline pill" affordance — keep
    // the tap target visually identical to the surrounding text and rely
    // on the accent colour to signal it's interactive.
    fontWeight: '600',
  },
});

// Hint for callers building feature detection: this is purely a leaf
// renderer; the surrounding PostCard decides whether to call it based on
// `parseSkyblurUrl` + `useSkyblurPost`.
export default SkyblurBody;
