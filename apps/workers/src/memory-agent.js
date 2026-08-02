import { createMemoryProposal } from '@lifeos/contracts';

export class MemoryAgent {
  #propose;

  constructor({ propose }) {
    this.#propose = propose;
  }

  async run({ recordId, text }) {
    if (!text?.trim()) {
      throw new Error('text is required');
    }

    const candidate = await this.#propose(text);
    return createMemoryProposal({ recordId, ...candidate });
  }
}
