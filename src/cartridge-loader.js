import { createDeck } from './engine.js?v=3.3.0';
import { pokemonUrl } from './cartridges.js?v=3.4.0';

// Cache successful reads (and share in-flight reads), but allow failures to retry.
export function createCartridgeLoader(fetcher = fetch) {
  const cache = new Map();
  function read(url) {
    if (!cache.has(url)) {
      const request = Promise.resolve().then(() => fetcher(url)).then(response => {
        if (!response.ok) throw new Error('Could not read cartridge data.');
        return response.json();
      }).catch(error => { cache.delete(url); throw error; });
      cache.set(url, request);
    }
    return cache.get(url);
  }
  return async cartridge => {
    const [pokemon, opponents, logos] = await Promise.all([
      read(pokemonUrl), read(cartridge.dataUrl),
      cartridge.logosUrl ? read(cartridge.logosUrl).catch(() => ({})) : {},
    ]);
    try {
      createDeck(pokemon, opponents, Math.random, cartridge.category);
    } catch (error) {
      cache.delete(pokemonUrl);
      cache.delete(cartridge.dataUrl);
      throw error;
    }
    return { pokemon, opponents, logos: logos && typeof logos === 'object' && !Array.isArray(logos) ? logos : {} };
  };
}
