/**
 * Hermes's implementation of Intl is not up to date and is missing some features. We rely mainly on `notation: "compact"`
 * to properly format currency values, but it is not supported in Hermes.
 * https://github.com/facebook/hermes/blob/5911e8180796d3ccb2669237ca441da717ad00b2/doc/IntlAPIs.md#limited-ios-property-support
 *
 * We need to polyfill some Intl APIs to make it work, and it seems that formatjs is doing the trick for us
 */

// Don't remove -force from these because detection is VERY slow on low-end Android.
// https://github.com/formatjs/formatjs/issues/4463#issuecomment-2176070577

import '@formatjs/intl-getcanonicallocales/polyfill-force';
import '@formatjs/intl-locale/polyfill-force';
import '@formatjs/intl-numberformat/polyfill-force';
import '@formatjs/intl-pluralrules/polyfill-force';
import '@formatjs/intl-relativetimeformat/polyfill-force';
// `Intl.DisplayNames` is missing on Hermes (used by the post-language picker
// to translate BCP-47 tags like `en` into `English`). Polyfill it + load
// the English locale data so we always have a sensible baseline.
import '@formatjs/intl-displaynames/polyfill-force';

import '@formatjs/intl-numberformat/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-relativetimeformat/locale-data/en';
import '@formatjs/intl-displaynames/locale-data/en';
