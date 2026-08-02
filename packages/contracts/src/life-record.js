export function createLifeRecordDraft({ userId, sourceType, rawText, mediaAssetId }) {
  if (!userId?.trim()) {
    throw new Error('userId is required');
  }

  if (sourceType === 'text' && !rawText?.trim()) {
    throw new Error('rawText is required for text records');
  }

  if (sourceType === 'voice' && !mediaAssetId?.trim()) {
    throw new Error('mediaAssetId is required for voice records');
  }

  if (sourceType !== 'text' && sourceType !== 'voice') {
    throw new Error('sourceType must be text or voice');
  }

  const createdAt = new Date().toISOString();

  return {
    userId,
    sourceType,
    ...(rawText ? { rawText } : {}),
    ...(mediaAssetId ? { mediaAssetId } : {}),
    status: 'draft',
    createdAt,
    updatedAt: createdAt,
  };
}
