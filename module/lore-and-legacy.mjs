import { LoreAndLegacyActor } from "./documents/actor.mjs";
import { LoreAndLegacyActorSheet } from "./sheets/actor-sheet.mjs";
import { PersonnageData } from "./data/actor-data.mjs"; // On importe le Data Model
import { CapaciteData } from "./data/item-data.mjs"; // Import du Data Model des Capacités

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

// --- INTÉGRATION AVEC LE MODULE DICE SO NICE! ---
Hooks.once("diceSoNiceReady", (dice3d) => {
  // Création du thème visuel pour le Dé de Fortune (Vert)
  dice3d.addColorset({
    name: "fortune",
    description: "Dé de Fortune",
    category: "Lore & Legacy",
    foreground: "#ffffff",
    background: "#2a7b36",
    outline: "#2a7b36",
    edge: "#2a7b36"
  });

  // Création du thème visuel pour le Dé d'Adversité (Rouge)
  dice3d.addColorset({
    name: "adversite",
    description: "Dé d'Adversité",
    category: "Lore & Legacy",
    foreground: "#ffffff",
    background: "#b32424",
    outline: "#b32424",
    edge: "#b32424"
  });
});
