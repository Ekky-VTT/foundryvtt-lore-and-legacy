import { LoreAndLegacyActor } from "./documents/actor.mjs";

/**
 * Initialisation du système Lore & Legacy
 */
Hooks.once("init", async function() {
  console.log("Lore & Legacy | Initialisation du système Lore & Legacy");

  // Déclaration de la classe personnalisée d'Actor
  CONFIG.Actor.documentClass = LoreAndLegacyActor;
});
