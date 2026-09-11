import { LoreAndLegacyActor } from "./documents/actor.mjs";
import { LoreAndLegacyActorSheet, LoreAndLegacyPNJSheet, LoreAndLegacyVehiculeSheet } from "./sheets/actor-sheet.mjs";
import { LoreAndLegacyItemSheet } from "./sheets/item-sheet.mjs"; // fiche des Traits
import { PersonnageData, PNJData, VehiculeData } from "./data/actor-data.mjs";
import { CapaciteData, SortilegeData, TraitData, TraitSpecialData, PouvoirData, PeupleData  } from "./data/item-data.mjs"; 
import { EquipementBaseData, ArmeData, ArmureData, ConsommableData, ArcanotechData, MaterielData, ComposantData, InvocationData } from "./data/item-data.mjs";

Hooks.once("init", async function() {
  console.log("Lore & Legacy | Initialisation du système Lore & Legacy");

  // Déclaration des Data Models
  CONFIG.Actor.dataModels.personnage = PersonnageData;
  CONFIG.Actor.dataModels.pnj = PNJData;
  CONFIG.Actor.dataModels.vehicule = VehiculeData;
  CONFIG.Item.dataModels.capacite = CapaciteData;
  CONFIG.Item.dataModels.sortilege = SortilegeData;
  CONFIG.Item.dataModels.trait = TraitData; 
  CONFIG.Item.dataModels.traitSpecial = TraitSpecialData;
  CONFIG.Item.dataModels.pouvoir = PouvoirData;
  CONFIG.Item.dataModels.peuple = PeupleData;
  CONFIG.Item.dataModels.equipement = EquipementBaseData; 
  CONFIG.Item.dataModels.arme = ArmeData;
  CONFIG.Item.dataModels.armure = ArmureData;
  CONFIG.Item.dataModels.consommable = ConsommableData;
  CONFIG.Item.dataModels.arcanotech = ArcanotechData;
  CONFIG.Item.dataModels.materiel = MaterielData;
  CONFIG.Item.dataModels.composant = ComposantData;
  CONFIG.Item.dataModels.invocation = InvocationData;

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

  // 4. Enregistrer la fiche Véhicule EXCLUSIVEMENT pour le type "vehicule"
  Actors.registerSheet("lore-and-legacy", LoreAndLegacyVehiculeSheet, { 
    types: ["vehicule"], 
    makeDefault: true,
    label: "Fiche Véhicule"
  });

  // Enregistrer la fiche personnalisée pour tous les types d'Items
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lore-and-legacy", LoreAndLegacyItemSheet, {
    makeDefault: true,
    label: "Fiche Lore & Legacy"
  });

  // 5. CRÉATION DE L'OPTION DANS LE MENU FOUNDRY POUR L'INITIATIVE ALÉATOIRE (+1D6)
  game.settings.register("lore-and-legacy", "initiativeD6", {
    name: "Règle Optionnelle : Initiative Aléatoire (+1D6)",
    hint: "Si cette case est cochée, un D6 sera lancé et ajouté à la Rapidité lors des jets d'initiative dans le Combat Tracker.",
    scope: "world",      // Option globale pour la partie, réservée au MJ
    config: true,        // Rend l'option visible dans l'interface de Configuration
    type: Boolean,       // Format "Case à cocher"
    default: false,      // Désactivé par défaut
    onChange: value => { 
      // Si le MJ modifie l'option en pleine partie, la formule s'adapte en direct
      CONFIG.Combat.initiative.formula = value ? "@secondaires.rapidite.initiative + 1d6" : "@secondaires.rapidite.initiative";
    }
  });

  // 5.1. LECTURE DE L'OPTION POUR LE COMBAT TRACKER
  const utiliseD6 = game.settings.get("lore-and-legacy", "initiativeD6");

  CONFIG.Combat.initiative = {
    // La formule s'adapte automatiquement selon l'état de l'option au démarrage
    formula: utiliseD6 ? "@secondaires.rapidite.initiative + 1d6" : "@secondaires.rapidite.initiative",
    decimals: 1
  };

});

Hooks.on("updateActor", async (actor, changed, options, userId) => {
  if (game.user.id !== userId) return;
  if (actor.type !== "personnage" && actor.type !== "pnj") return;

  const expanded = foundry.utils.expandObject(changed);
  const pvChanged = expanded.system?.secondaires?.pv?.value !== undefined;
  const rdcChanged = expanded.system?.secondaires?.rdc?.value !== undefined;

  if (pvChanged || rdcChanged) {
    const currentPV = Number(actor.system.secondaires?.pv?.value ?? 0);
    const currentRDC = Number(actor.system.secondaires?.rdc?.value ?? 0);

    const hcVal = (currentPV === 0 && currentRDC > 0);
    const incVal = (currentPV < 0 && currentRDC > 0);
    const ecVal = (currentPV <= 0 && currentRDC <= 0);

    const etats = actor.system.status?.etats || {};
    const updates = {};

    if (etats.horsCombat !== hcVal) updates["system.status.etats.horsCombat"] = hcVal;
    if (etats.inconscient !== incVal) updates["system.status.etats.inconscient"] = incVal;
    if (etats.etatCritique !== ecVal) updates["system.status.etats.etatCritique"] = ecVal;

    // Check if the user manually overrode these statuses in this exact update
    if (expanded.system?.status?.etats?.horsCombat !== undefined) delete updates["system.status.etats.horsCombat"];
    if (expanded.system?.status?.etats?.inconscient !== undefined) delete updates["system.status.etats.inconscient"];
    if (expanded.system?.status?.etats?.etatCritique !== undefined) delete updates["system.status.etats.etatCritique"];

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
    }
  }
});

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  if (game.user.id !== userId) return;
  if (!effect.parent || !(effect.parent instanceof Actor)) return;
  
  const actor = effect.parent;
  if (actor.type !== "personnage" && actor.type !== "pnj") return;

  const updates = {};
  const isV11 = effect.statuses instanceof Set;
  
  const hasStatus = (id) => isV11 ? effect.statuses.has(id) : effect.getFlag("core", "statusId") === id;

  if (hasStatus("stun")) updates["system.status.etats.immobilise"] = true;
  if (hasStatus("paralysis")) updates["system.status.etats.paralyse"] = true;
  if (hasStatus("prone")) updates["system.status.etats.renverse"] = true;
  if (hasStatus("dead")) updates["system.status.etats.etatCritique"] = true;

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }
});

Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
  if (game.user.id !== userId) return;
  if (!effect.parent || !(effect.parent instanceof Actor)) return;
  
  const actor = effect.parent;
  if (actor.type !== "personnage" && actor.type !== "pnj") return;

  const updates = {};
  const isV11 = effect.statuses instanceof Set;
  
  const hasStatus = (id) => isV11 ? effect.statuses.has(id) : effect.getFlag("core", "statusId") === id;

  if (hasStatus("stun")) updates["system.status.etats.immobilise"] = false;
  if (hasStatus("paralysis")) updates["system.status.etats.paralyse"] = false;
  if (hasStatus("prone")) updates["system.status.etats.renverse"] = false;
  if (hasStatus("dead")) updates["system.status.etats.etatCritique"] = false;

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }
});

Hooks.on("preCreateToken", (tokenDocument, tokenData, options, userId) => {
  // On ne le fait que si le token n'est pas lié (PNJ/Monstre classique) et si c'est nous qui le créons
  if (tokenDocument.actorLink === false && userId === game.userId) {
    const actor = tokenDocument.actor;
    if (actor && actor.type === "pnj") {
      // On prépare les valeurs actuelles pour qu'elles soient égales au Max
      const deltaUpdate = {
        system: {
          secondaires: {
            pv: { value: actor.system.secondaires.pv.max || 0 },
            pm: { value: actor.system.secondaires.pm.max || 0 },
            rdc: { value: actor.system.secondaires.rdc.max || 0 }
          }
        }
      };
      tokenDocument.updateSource({ delta: deltaUpdate });
    }
  }
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
        Number(button.dataset.multiplier),
        button.dataset.targetUuid
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
        Number(button.dataset.multiplier),
        button.dataset.targetUuid
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

  // 5. Application des dégâts (Réservé au MJ)
  const applyDamageBtns = html.querySelectorAll(".lnl-apply-damage");
  applyDamageBtns.forEach(btn => {
    if (!game.user.isGM) {
      btn.style.display = "none";
      return;
    }

    btn.addEventListener("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      const targetActor = (await fromUuid(button.dataset.targetUuid))?.actor;
      if (!targetActor) return;

      const damage = Number(button.dataset.damage) || 0;
      const currentPV = Number(targetActor.system.secondaires?.pv?.value) || 0;
      const currentRDC = Number(targetActor.system.secondaires?.rdc?.value) || 0;
      
      let newPV = currentPV;
      let newRDC = currentRDC;
      let isCritical = false;

      if (damage <= currentPV) {
        newPV -= damage;
      } else {
        const remainder = damage - currentPV;
        newPV = 0;
        if (remainder <= currentRDC) {
          newRDC -= remainder;
        } else {
          newRDC = 0;
          isCritical = true;
        }
      }

      await targetActor.update({ 
        "system.secondaires.pv.value": newPV,
        "system.secondaires.rdc.value": newRDC
      });
      
      let publicMessage = `⚔️ <b>${targetActor.name}</b> encaisse <b>${damage}</b> dégâts !`;
      if (isCritical) {
        publicMessage += ` <br><span style="color:#b32424; font-weight:bold; text-transform:uppercase;">🚨 ÉTAT CRITIQUE (Aux portes de la mort) 🚨</span>`;
      }

      // Message public
      ChatMessage.create({
        content: publicMessage,
        speaker: ChatMessage.getSpeaker({ user: game.user })
      });
      
      // Chuchotement au MJ pour le suivi exact
      ChatMessage.create({
        content: `<span style="color:#555;"><i>Suivi MJ : ${targetActor.name} a désormais ${newPV} PV et ${newRDC} RDC.</i></span>`,
        whisper: ChatMessage.getWhisperRecipients("GM")
      });
      
      button.disabled = true;
    });
  });

});

Hooks.on("preUpdateToken", (tokenDocument, updateData, options, userId) => {
  // On ne vérifie que pour l'utilisateur qui fait l'action
  if (userId !== game.userId) return;

  // On vérifie si c'est un déplacement (modification de X ou Y)
  if (updateData.x !== undefined || updateData.y !== undefined) {
    
    // Règle : Le MJ peut contourner le blocage
    if (game.user.isGM) return true;

    const actor = tokenDocument.actor;
    if (!actor || !actor.system?.status?.etats) return true;

    const etats = actor.system.status.etats;
    const isBlocked = etats.immobilise || etats.paralyse || etats.renverse || etats.horsCombat || etats.inconscient || etats.etatCritique;

    if (isBlocked) {
      ui.notifications.warn(`Déplacement impossible : ${actor.name} est sous l'effet d'un état bloquant (Immobilisé, Paralysé, Renversé, Inconscient, etc.) !`);
      return false; // Annule la mise à jour
    }
  }
  return true;
});
