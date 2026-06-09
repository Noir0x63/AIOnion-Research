/**
 * Venice AI Service Client.
 * Implements Dependency Injection (injected fetch and configuration).
 */
export class VeniceLlmService {
  #apiKey;
  #model;
  #temperature;
  #fetchInstance;
  #apiBaseUrl;

  /**
   * @param {Object} params
   * @param {string} params.apiKey Venice AI API key
   * @param {string} params.model Venice AI model name (e.g. deepseek-r1)
   * @param {number} [params.temperature] Default temperature (0.0 to 1.0)
   * @param {Function} [params.fetchInstance] Optional fetch function injection (defaults to global fetch)
   */
  constructor({ apiKey, model, temperature = 0.1, fetchInstance = fetch }) {
    if (!apiKey) {
      throw new Error('VeniceLlmService: apiKey is required.');
    }
    if (!model) {
      throw new Error('VeniceLlmService: model name is required.');
    }

    this.#apiKey = apiKey;
    this.#model = model;
    this.#temperature = temperature;
    this.#fetchInstance = fetchInstance;
    this.#apiBaseUrl = 'https://api.venice.ai/api/v1';
  }

  /**
   * Generates a completion for the given messages.
   * Uses modern async/await and robust error handling.
   * 
   * @param {Array<Object>} messages Array of messages { role, content }
   * @param {Object} [options] Completion options
   * @param {number} [options.temperature] Temperature (0.0 to 1.0)
   * @returns {Promise<string>} Content of the LLM response
   */
  async generateCompletion(messages, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('VeniceLlmService: messages must be a non-empty array.');
    }

    const url = `${this.#apiBaseUrl}/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${this.#apiKey}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      model: this.#model,
      messages,
      temperature: options.temperature ?? this.#temperature,
    };

    try {
      const response = await this.#fetchInstance(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice || !choice.message?.content) {
        throw new Error('Invalid or empty response format from Venice AI API.');
      }

      return choice.message.content;
    } catch (error) {
      throw new Error(`Venice AI API Completion Failure: ${error.message}`);
    }
  }
}
