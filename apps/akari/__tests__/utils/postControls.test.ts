import { DEFAULT_POST_CONTROLS, describePostControls, type PostControls } from '@/utils/postControls';

const t = (key: string) => key;

describe('describePostControls', () => {
  it('describes the default everyone-can-reply state', () => {
    expect(describePostControls(DEFAULT_POST_CONTROLS, t)).toBe('post.controls.everyoneReply');
  });

  it('describes nobody-can-reply', () => {
    const controls: PostControls = { replyAllow: { type: 'nobody' }, allowQuote: true };
    expect(describePostControls(controls, t)).toBe('post.controls.nobodyReply');
  });

  it('joins the active limited rules', () => {
    const controls: PostControls = {
      replyAllow: { type: 'limited', mention: true, following: true, listUris: ['at://list'] },
      allowQuote: true,
    };
    expect(describePostControls(controls, t)).toBe(
      'post.controls.mentioned, post.controls.following, post.controls.lists',
    );
  });

  it('includes followers when set', () => {
    const controls: PostControls = {
      replyAllow: { type: 'limited', follower: true },
      allowQuote: false,
    };
    expect(describePostControls(controls, t)).toBe('post.controls.followers');
  });

  it('treats an empty limited rule set as nobody', () => {
    const controls: PostControls = { replyAllow: { type: 'limited' }, allowQuote: true };
    expect(describePostControls(controls, t)).toBe('post.controls.nobodyReply');
  });

  it('flags everyone-reply-but-no-quote', () => {
    const controls: PostControls = { replyAllow: { type: 'everyone' }, allowQuote: false };
    expect(describePostControls(controls, t)).toBe('post.controls.everyoneReplyNoQuote');
  });
});
