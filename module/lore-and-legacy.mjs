import { LoreAndLegacyActor } from "./documents/actor.mjs";
import { LoreAndLegacyActorSheet, LoreAndLegacyPNJSheet } from "./sheets/actor-sheet.mjs";
import { LoreAndLegacyItemSheet } from "./sheets/item-sheet.mjs"; // fiche des Traits
import { PersonnageData, PNJData } from "./data/actor-data.mjs";
import { CapaciteData, SortilegeData, TraitData, TraitSpecialData, PouvoirData, PeupleData  } from "./data/item-data.mjs"; 
import { EquipementBaseData, ArmeData, ArmureData, ConsommableData, ArcanotechData, MaterielData, ComposantData } from "./data/item-data.mjs";

Hooks.once("init", async function() {
  console.log("Lore & Legacy | Initialisation du système Lore & Legacy");

  // Déclaration des Data Models
  CONFIG.Actor.dataModels.personnage = PersonnageData;
  CONFIG.Actor.dataModels.pnj = PNJData;
  CONFIG.Item.dataModels.capacite = CapaciteData;
  CONFIG.Item.dataModels.sortilege = SortilegeData;
  CONFIG.Item.dataModels.trait = TraitData; 
  CONFIG.Item.dataModels.traitSpecial = TraitSpecialData;
  CONFIG.Item.dataModels.pouvoir = PouvoirData;
  CONFIG.Item.dataModels.peuple = PeupleData;
  CONFIG.Item.dataModels.equipement = EquipementBaseData; // Pour le matériel générique
  CONFIG.Item.dataModels.arme = ArmeData;
  CONFIG.Item.dataModels.armure = ArmureData;
  CONFIG.Item.dataModels.consommable = ConsommableData;
  CONFIG.Item.dataModels.arcanotech = ArcanotechData;
  CONFIG.Item.dataModels.materiel = MaterielData;
  CONFIG.Item.dataModels.composant = ComposantData;

    // Déclaration des Classes de Documents
  CONFIG.Actor.documentClass = LoreAndLegacyActor;

  // 1. Désinscrire la fiche par défaut de Foundry
  Actors.unregisterSheet("core", ActorSheet);

  // 2. Enregistrer la fiche PJ EXCLUSIVEMENT pour le type "personnage"
  Actors.registerSheet("lore-and-legacy", LoreAndLegacyActorSheet, {
    types: ["personnage"],
    makeDefault: true,
    label: "Fiche Personnage (PJ)"
  });

  // 3. Enregistrer la fiche PNJ EXCLUSIVEMENT pour le type "pnj"
  Actors.registerSheet("lore-and-legacy", LoreAndLegacyPNJSheet, {
    types: ["pnj"],
    makeDefault: true,
    label: "Fiche Monstre / PNJ"
  });

  // Enregistrer la fiche personnalisée pour tous les types d'Items
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lore-and-legacy", LoreAndLegacyItemSheet, {
    makeDefault: true,
    label: "Fiche Lore & Legacy"
  });

  
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

Hooks.on("renderChatMessageHTML", (message, html) => {
  
  // 1. Dégâts d'Arme (Ciblé)
  const dmgBtns = html.querySelectorAll(".lnl-damage-roll");
  dmgBtns.forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const actor = await fromUuid(button.dataset.actorUuid);
      if (!actor?.isOwner) return;

      await actor.rollArmeDegats(
        button.dataset.itemId,
        decodeURIComponent(button.dataset.targetName),
        button.dataset.degree,
        Number(button.dataset.multiplier)
      );
      button.disabled = true; // Empêche le double-clic
    });
  });

  // 2. Dégâts d'Arme (Manuel sans cible)
  const manualDmgBtns = html.querySelectorAll(".lnl-manual-damage-roll");
  manualDmgBtns.forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const actor = await fromUuid(button.dataset.actorUuid);
      if (!actor?.isOwner) return;

      await actor.promptManualDamage(button.dataset.itemId);
    });
  });

  // 3. Dégâts de Sortilège (Ciblé)
  const sortDmgBtns = html.querySelectorAll(".lnl-sort-damage-roll");
  sortDmgBtns.forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const actor = await fromUuid(button.dataset.actorUuid);
      if (!actor?.isOwner) return;

      await actor.rollSortilegeDegats(
        button.dataset.itemId,
        decodeURIComponent(button.dataset.targetName),
        button.dataset.degree,
        Number(button.dataset.multiplier)
      );
      button.disabled = true;
    });
  });

  // 4. Dégâts de Sortilège (Manuel sans cible)
  const manualSortBtns = html.querySelectorAll(".lnl-manual-sort-damage-roll");
  manualSortBtns.forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const actor = await fromUuid(button.dataset.actorUuid);
      if (!actor?.isOwner) return;

      await actor.promptManualSortilegeDamage(button.dataset.itemId);
    });
  });

});
