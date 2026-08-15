import { LoreAndLegacyActor } from "./documents/actor.mjs";
import { LoreAndLegacyActorSheet } from "./sheets/actor-sheet.mjs";
import { LoreAndLegacyItemSheet } from "./sheets/item-sheet.mjs"; // fiche des Traits
import { PersonnageData } from "./data/actor-data.mjs";
import { CapaciteData, TraitData } from "./data/item-data.mjs"; 

Hooks.once("init", async function() {
  console.log("Lore & Legacy | Initialisation du système Lore & Legacy");

  // Déclaration des Data Models
  CONFIG.Actor.dataModels.personnage = PersonnageData;
  CONFIG.Item.dataModels.capacite = CapaciteData;
  CONFIG.Item.dataModels.trait = TraitData; 

    // Déclaration des Classes de Documents
  CONFIG.Actor.documentClass = LoreAndLegacyActor;

  // Enregistrement de la fiche de personnage
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lore-and-legacy", LoreAndLegacyActorSheet, { makeDefault: true });

  // Enregistrement de la fiche d'Objet (Item)
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lore-and-legacy", LoreAndLegacyItemSheet, { makeDefault: true });
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
