import { LoreAndLegacyActor } from "./documents/actor.mjs";
import { LoreAndLegacyActorSheet } from "./sheets/actor-sheet.mjs";

/**
 * Initialisation du système Lore & Legacy
 */
Hooks.once("init", async function() {
  console.log("Lore & Legacy | Initialisation du système Lore & Legacy");

  // Déclaration de la classe personnalisée d'Actor
  CONFIG.Actor.documentClass = LoreAndLegacyActor;

  // Enregistrement de la fiche de personnage
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lore-and-legacy", LoreAndLegacyActorSheet, { makeDefault: true });
});
