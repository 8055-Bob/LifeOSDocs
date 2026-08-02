import { randomUUID } from 'node:crypto';

export class MediaUploadService {
  #assets = new Map();

  createUploadIntent({ userId, contentType }) {
    if (!userId?.trim()) {
      throw new Error('userId is required');
    }

    if (!contentType?.startsWith('audio/')) {
      throw new Error('Only audio uploads are supported');
    }

    const mediaAssetId = `media_${randomUUID()}`;
    this.#assets.set(mediaAssetId, { userId, contentType });

    return {
      mediaAssetId,
      contentType,
      uploadUrl: `memory-upload://${mediaAssetId}`,
    };
  }

  canAccess(userId, mediaAssetId) {
    return this.#assets.get(mediaAssetId)?.userId === userId;
  }
}
