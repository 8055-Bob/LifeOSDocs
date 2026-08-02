const confirmationActions = {
  correct_assertion: 'apply_correction',
  delete_record: 'delete_record',
};

export function createDataControlViewModel({ action, targetId }) {
  if (!confirmationActions[action]) {
    throw new Error('Unsupported data-control action');
  }

  return {
    action,
    targetId,
    requiresConfirmation: true,
    confirmationAction: confirmationActions[action],
  };
}
