# Scripts

This directory contains utility scripts for the Akari v2 project.

## Available Scripts

### `reset-project.js`

Resets the project to a clean state by removing generated files and dependencies.

**Usage:**

```bash
npm run reset-project
```

### `add-translation-keys.js`

Adds missing translation keys to all language files based on the English translation file.

**Usage:**

```bash
npm run add-translations
```

### `validate-translations.js`

Validates all translation files to ensure they match the exact structure of the English translation file (`en.json`). This script:

- Checks for missing keys in other language files
- Identifies extra keys that don't exist in the reference file
- Reports JSON parsing errors
- Provides a detailed summary of validation results

**Usage:**

```bash
npm run validate-translations
```

**Output Example:**

```
📋 Reference file has 304 keys
🔍 Validating 20 translation files...

✅ en-US.json: Valid
❌ ar.json: Invalid
   Extra keys (1):
     + translations.common.noTextContent

📊 Summary:
   Total files: 20
   Valid: 1
   Invalid: 19

⚠️  Some translation files have issues. Please fix them.
```

**Exit Codes:**

- `0`: All translation files are valid
- `1`: One or more translation files have issues

### `find-unused-translations.js`

Finds translation keys that exist in `en.json` but are not used anywhere in the codebase. This script:

- Extracts all translation keys from `en.json`
- Searches through all TypeScript/TSX files for usage patterns
- Identifies unused translation keys
- Reports missing keys that are used but don't exist in `en.json`
- Shows usage statistics for the most frequently used keys

**Usage:**

```bash
npm run find-unused-translations
```

**Output Example:**

```
🔍 Finding unused translation keys...

📋 Found 317 translation keys in en.json

🔍 Searching through 45 TypeScript/TSX files...

📊 Translation Usage Report
========================

Total keys in en.json: 317
Keys used in codebase: 89
Unused keys: 228
Missing keys: 0

❌ Unused Translation Keys (228):
----------------------------------------
• auth.accountAddedSuccessfully
• auth.alreadyConnected
• auth.alreadyHaveAccount
• auth.appPassword
• auth.appPasswordHelperText
• auth.appPasswordInstructions
• auth.appPasswordPlaceholder
• auth.bioPlaceholder
• auth.bioRequired
• auth.blueskyHandle
• auth.blueskyHandlePlaceholder
• auth.changeBanner
• auth.changeBannerError
• auth.changeBannerSuccess
• auth.changeAvatar
• auth.changeAvatarError
• auth.changeAvatarSuccess
• auth.connectAccount
• auth.connectAccountToGetStarted
• auth.connectAnotherAccount
• auth.connectBluesky
• auth.connectNew
• auth.connectedSuccessfully
• auth.connectionFailed
• auth.connecting
• auth.customPdsServer
• auth.dontHaveAccount
• auth.editProfile
• auth.editProfileError
• auth.editProfileSuccess
• auth.emailPlaceholder
• auth.emailRequired
• auth.exportData
• auth.exportDataError
• auth.exportDataSuccess
• auth.fillAllFields
• auth.forgotPassword
• auth.handleHelperText
• auth.handlePlaceholder
• auth.handleRequired
• auth.howToGetAppPassword
• auth.invalidBlueskyHandle
• auth.invalidEmail
• auth.invalidHandle
• auth.invalidPassword
• auth.invalidUsername
• auth.locationPlaceholder
• auth.locationRequired
• auth.needDifferentAccount
• auth.pdsUrlHelperText
• auth.pdsUrlPlaceholder
• auth.signInDescription
• auth.signInFailed
• auth.signInTitle
• auth.signInToBluesky
• auth.signInWithBluesky
• auth.signInWithEmail
• auth.signInWithHandleAndPassword
• auth.signOutDescription
• auth.signOutTitle
• auth.signedInSuccessfully
• auth.signingIn
• auth.signUpDescription
• auth.signUpTitle
• auth.signUpWithBluesky
• auth.signUpWithEmail
• auth.websitePlaceholder
• auth.websiteRequired
• common.actions
• common.addAccount
• common.andOneOther
• common.andOthers
• common.bookmark
• common.bookmarkedBy
• common.bookmarks
• common.clearCache
• common.clearCacheError
• common.clearCacheSuccess
• common.connectAnotherAccount
• common.current
• common.currentAccount
• common.deleteAccount
• common.deleteAccountConfirm
• common.deleteAccountError
• common.deleteAccountSuccess
• common.deletePost
• common.deletePostConfirm
• common.deletePostError
• common.deletePostSuccess
• common.deviceInfo
• common.disconnectAllAccounts
• common.done
• common.edit
• common.editPost
• common.editPostError
• common.editPostSuccess
• common.errorBlocking
• common.errorBookmarking
• common.errorDeleting
• common.errorExportingData
• common.errorFollowing
• common.errorLiking
• common.errorLoadingBookmarks
• common.errorLoadingConversations
• common.errorLoadingFeed
• common.errorLoadingMessages
• common.errorLoadingNotifications
• common.errorLoadingPosts
• common.errorLoadingProfile
• common.errorLoadingSearch
• common.errorLoadingTimeline
• common.errorReplying
• common.errorReposting
• common.errorSaving
• common.errorSigningIn
• common.errorSigningOut
• common.errorSigningUp
• common.errorUnblocking
• common.errorUnbookmarking
• common.errorUnfollowing
• common.errorUnliking
• common.exportData
• common.exportDataError
• common.exportDataSuccess
• common.feedback
• common.help
• common.hide
• common.joined
• common.likedBy
• common.location
• common.muteUser
• common.muteUserError
• common.muteUserSuccess
• common.networkError
• common.next
• common.noAccounts
• common.noBookmarks
• common.noBookmarksYet
• common.noConversations
• common.noFeed
• common.noFollowers
• common.noFollowersYet
• common.noFollowing
• common.noFollowingYet
• common.noLikes
• common.noLikesYet
• common.noMedia
• common.noMediaYet
• common.noMessages
• common.noNotifications
• common.noPosts
• common.noPostsYet
• common.noProfile
• common.noReplies
• common.noRepliesYet
• common.noReposts
• common.noRepostsYet
• common.noResults
• common.noSearchResults
• common.noTextContent
• common.noTimeline
• common.noUser
• common.ok
• common.pending
• common.posts
• common.previous
• common.privacyPolicy
• common.remove
• common.removeAllConnections
• common.repliedToYourPost
• common.replies
• common.repostedBy
• common.reposts
• common.reportPost
• common.reportPostError
• common.reportPostSuccess
• common.retry
• common.save
• common.serverError
• common.share
• common.show
• common.signIn
• common.signOut
• common.signUp
• common.startConversation
• common.success
• common.switch
• common.terms
• common.unknown
• common.unknownError
• common.unlike
• common.unmuteUser
• common.unmuteUserError
• common.unmuteUserSuccess
• common.video
• common.website
• messages.messageError
• messages.messageSent
• messages.noMessages
• messages.sendMessage
• messages.startConversation
• messages.typeMessage
• navigation.conversations
• navigation.feed
• navigation.home
• navigation.messages
• navigation.notifications
• navigation.profile
• navigation.search
• navigation.settings
• navigation.timeline
• notifications.andOneOther
• notifications.andOthers
• notifications.errorLoadingNotifications
• notifications.loadingMoreNotifications
• notifications.loadingNotifications
• notifications.noNotificationsYet
• notifications.notificationsWillAppearHere
• notifications.quotedYourPost
• notifications.somethingWentWrong
• posts.bookmarkedBy
• posts.copyLink
• posts.copyLinkError
• posts.copyLinkSuccess
• posts.deletePost
• posts.deletePostConfirm
• posts.deletePostError
• posts.deletePostSuccess
• posts.editPost
• posts.editPostError
• posts.editPostSuccess
• posts.likedBy
• posts.muteUser
• posts.muteUserError
• posts.muteUserSuccess
• posts.newPost
• posts.postButton
• posts.postError
• posts.postPlaceholder
• posts.postSuccess
• posts.replyTo
• posts.reportPost
• posts.reportPostError
• posts.reportPostSuccess
• posts.repostedBy
• posts.showLess
• posts.showMore
• profile.bookmarks
• profile.editProfile
• profile.editProfileError
• profile.editProfileSuccess
• profile.followers
• profile.following
• profile.likes
• profile.media
• profile.noBookmarks
• profile.noBookmarksYet
• profile.noContent
• profile.noLikes
• profile.noLikesYet
• profile.noMedia
• profile.noMediaYet
• profile.noPosts
• profile.noReplies
• profile.noReposts
• profile.posts
• profile.replies
• profile.reposts
• search.all
• search.loadingMoreResults
• search.noPostsFound
• search.noResultsFound
• search.noUsersFound
• search.posts
• search.searchFailed
• search.searching
• search.users
• settings.about
• settings.account
• settings.appearance
• settings.buildNumber
• settings.checkMissingTranslations
• settings.developmentTool
• settings.feedback
• settings.help
• settings.language
• settings.notifications
• settings.privacy
• settings.terms
• settings.version

🔥 Most Used Translation Keys:
-----------------------------
• common.loading (15 times)
• common.error (12 times)
• common.search (8 times)
• common.posts (6 times)
• common.replies (6 times)
• common.likes (6 times)
• common.media (6 times)
• common.noTextContent (6 times)
• common.unknown (5 times)
• common.noContent (5 times)

⚠️  Issues found. Consider cleaning up unused keys or adding missing ones.
```

**Exit Codes:**

- `0`: No issues found (all keys are used)
- `1`: Issues found (unused keys or missing keys)

## Running Scripts

All scripts can be run using npm:

```bash
npm run <script-name>
```

Or directly with node:

```bash
node scripts/<script-name>.js
```
