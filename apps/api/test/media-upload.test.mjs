import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaUploadService } from '../src/media-upload.js';

test('creates an audio upload intent owned by the requesting user', () => {
  const service = new MediaUploadService();

  const intent = service.createUploadIntent({
    userId: 'user_1',
    contentType: 'audio/m4a',
  });

  assert.match(intent.mediaAssetId, /^media_/);
  assert.match(intent.uploadUrl, /^memory-upload:\/\//);
  assert.equal(intent.contentType, 'audio/m4a');
  assert.equal(service.canAccess('user_1', intent.mediaAssetId), true);
  assert.equal(service.canAccess('user_2', intent.mediaAssetId), false);
});

test('rejects an unsupported media content type', () => {
  const service = new MediaUploadService();

  assert.throws(
    () => service.createUploadIntent({ userId: 'user_1', contentType: 'image/png' }),
    { message: 'Only audio uploads are supported' },
  );
});
