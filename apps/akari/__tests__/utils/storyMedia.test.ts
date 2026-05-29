import { buildStoryBlobUrl, findStoryImageBlob } from '@/utils/storyMedia';

const imageBlob = (over: Record<string, unknown> = {}) => ({
  $type: 'blob',
  ref: { $link: 'bafyimage' },
  mimeType: 'image/jpeg',
  size: 1234,
  ...over,
});

describe('findStoryImageBlob', () => {
  it('returns undefined for non-object input', () => {
    expect(findStoryImageBlob(null)).toBeUndefined();
    expect(findStoryImageBlob('string')).toBeUndefined();
    expect(findStoryImageBlob(42)).toBeUndefined();
  });

  it('finds a top-level image blob', () => {
    expect(findStoryImageBlob({ image: imageBlob() })).toEqual({
      cid: 'bafyimage',
      mimeType: 'image/jpeg',
      size: 1234,
    });
  });

  it('finds a deeply nested image blob (Spark-style)', () => {
    const value = { media: { embed: { story: { image: imageBlob() } } } };
    expect(findStoryImageBlob(value)?.cid).toBe('bafyimage');
  });

  it('accepts a blob with no mimeType', () => {
    const value = { image: imageBlob({ mimeType: undefined }) };
    expect(findStoryImageBlob(value)).toEqual({ cid: 'bafyimage', mimeType: undefined, size: 1234 });
  });

  it('ignores non-image blobs', () => {
    const value = { video: imageBlob({ mimeType: 'video/mp4' }) };
    expect(findStoryImageBlob(value)).toBeUndefined();
  });

  it('ignores objects that are not blobs', () => {
    expect(findStoryImageBlob({ ref: { $link: 'x' }, mimeType: 'image/png' })).toBeUndefined();
  });

  it('resolves a string ref', () => {
    const value = { image: { $type: 'blob', ref: 'rawcid', mimeType: 'image/png' } };
    expect(findStoryImageBlob(value)?.cid).toBe('rawcid');
  });

  it('skips blobs without a resolvable cid', () => {
    const value = { image: { $type: 'blob', ref: {}, mimeType: 'image/png' } };
    expect(findStoryImageBlob(value)).toBeUndefined();
  });
});

describe('buildStoryBlobUrl', () => {
  it('builds an encoded getBlob URL', () => {
    expect(buildStoryBlobUrl('https://pds.example', 'did:plc:abc', 'bafycid')).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafycid',
    );
  });
});
