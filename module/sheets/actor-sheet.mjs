export class LoreAndLegacyActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lore-and-legacy", "sheet", "actor"],
      template: "systems/lore-and-legacy/templates/actor/actor-personnage-sheet.html",
      width: 760,
      height: 1024,
      // LA CORRECTION EST ICI : ".window-content" englobe toute la fenêtre
      dragDrop: [{ dragSelector: ".item", dropSelector: ".window-content" }],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "actions" }]
    });
  }

  /**
   * Intercepte SPÉCIFIQUEMENT le glisser-déposer des Objets (Items)
   * @override
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;

    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    const dropZone = event.target.closest?.("[data-drop-type]");
    if (dropZone) {
      const allowedType = dropZone.dataset.dropType;
      if (item.type !== allowedType) {
        ui.notifications.warn(`Cette zone accepte uniquement : ${allowedType === "traitSpecial" ? "Trait Spécial" : "Capacité"}.`);
        return false;
      }
    }

    const itemData = item.toObject();
    // LE NOUVEAU LOG QUI DIT TOUT :
    console.log(`Lore & Legacy | Objet déposé -> Nom : "${itemData.name}" | TYPE : [${itemData.type}]`);

    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, itemData);
    }

    return this._onDropItemCreate(itemData);
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    // On pointe vers les données vivantes (et non context.data.system)
    context.system = this.actor.system; 
    this._prepareItems(context);
    return context;
  }

  _prepareItems(context) {
    const capacities = [];
    const traits = [];
    const traitsSpeciaux = [];
    const armes = [];
    const armures = [];
    const consommables = [];
    const materiels = [];
    const divers = [];
    const attributs = this.actor.system.attributs;

    for (let item of this.actor.items) {
      let itemData = item.toObject(false);

      if (item.type === "capacite") {
        const attrLie = item.system.attributLie;
        const parentFortune = (attrLie && attributs[attrLie]) ? attributs[attrLie].fortune : false;
        const parentAdversite = (attrLie && attributs[attrLie]) ? attributs[attrLie].adversite : false;

        itemData.displayFortune = item.system.fortune || parentFortune;
        itemData.displayAdversite = item.system.adversite || parentAdversite;
        itemData.lockFortune = parentFortune; 
        itemData.lockAdversite = parentAdversite;

        capacities.push(itemData);
      }
      
      if (item.type === "trait") traits.push(itemData);
      if (item.type === "traitSpecial") traitsSpeciaux.push(itemData);

      // --- LES ARMES CLASSIQUES ---
      if (item.type === "arme") {
        itemData.typeArmeLabel = item.system.typeArme === "distance" ? "Distance" : "Mêlée";
        
        // Calcul du libellé de portée pour le tableau
        if (item.system.typeArme === "distance") {
          itemData.porteeAffichee = `${item.system.porteeMoyenne || 0} / ${item.system.porteeMax || 0} m`;
        } else {
          itemData.porteeAffichee = "Mêlée";
        }

        armes.push(itemData);
      }

      // --- L'ARCANOTECH ---
      if (item.type === "arcanotech") {
        if (item.system.sousType === "armeMelee" || item.system.sousType === "armeTir") {
          itemData.name = itemData.name + " (Arcanotech)";
          itemData.typeArmeLabel = item.system.sousType === "armeTir" ? "Distance" : "Mêlée";
          itemData.porteeAffichee = item.system.sousType === "armeTir"
            ? `${item.system.porteeMoyenne || 0} / ${item.system.porteeMax || 0} m`
            : "Mêlée";
          armes.push(itemData);
        } else {
          divers.push(itemData);
        }
      }

      // --- LES ARMURES ---
      if (item.type === "armure") {
        const categories = { legere: "Armures", lourde: "Armures", bouclier: "Bouclier", accessoire: "Accessoire" };
        itemData.categorieArmure = categories[item.system.type] || categories.legere;
        armures.push(itemData);
      }

      // --- CONSOMMABLES & MATÉRIELS ---
      if (item.type === "consommable") {
        itemData.usagesActuels = item.getFlag("lore-and-legacy", "usagesActuels") ?? item.system.charges ?? 1;
        itemData.usagesMax = item.system.charges || 1;
        if (itemData.usagesActuels > 0) consommables.push(itemData);
      }

      if (item.type === "materiel") {
        itemData.usagesActuels = item.getFlag("lore-and-legacy", "usagesActuels") ?? item.system.usagesMax ?? 1;
        itemData.usagesMax = item.system.usagesMax || 1;
        if (itemData.usagesActuels > 0) materiels.push(itemData);
      }

      if (item.type === "composant") divers.push(itemData);
    }
    
    // Tris et assignations au contexte
    context.capacites = capacities.sort((a, b) => a.name.localeCompare(b.name));
    context.traits = traits.sort((a, b) => a.name.localeCompare(b.name));
    context.traitsSpeciaux = traitsSpeciaux.sort((a, b) => a.name.localeCompare(b.name));
    
    context.armures = armures.sort((a, b) => {
      const categoryOrder = ["Armures", "Bouclier", "Accessoire"];
      return categoryOrder.indexOf(a.categorieArmure) - categoryOrder.indexOf(b.categorieArmure) || a.name.localeCompare(b.name);
    });
    
    context.armures.forEach((arm, index, liste) => {
      arm.afficherCategorie = index === 0 || arm.categorieArmure !== liste[index - 1].categorieArmure;
    });

    // --- TRI ET CATÉGORISATION DES ARMES (La modification de l'étape 2) ---
    // On trie d'abord par "Est-ce que c'est équipé ?" puis par ordre alphabétique
    armes.sort((a, b) => {
      if (a.system.equipe !== b.system.equipe) return b.system.equipe ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    let eqCount = 0;
    armes.forEach((arme, index, liste) => {
      if (arme.system.equipe) {
        eqCount++;
        arme.categorieArme = eqCount === 1 ? "Arme Principale" : "Arme Secondaire";
      } else {
        arme.categorieArme = "Armes rangées (Non équipées)";
      }
      // Indique au HTML s'il faut afficher la bannière de catégorie
      arme.afficherCategorie = index === 0 || arme.categorieArme !== liste[index - 1].categorieArme;
    });
    
    context.armes = armes;
    // ----------------------------------------------------------------------
    
    context.consommables = consommables.sort((a, b) => a.name.localeCompare(b.name));
    context.materiels = materiels.sort((a, b) => a.name.localeCompare(b.name));
    context.divers = divers.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Intercepte uniquement la CRÉATION finale des objets déposés.
   * Le "Drop" en lui-même est géré par Foundry en amont.
   * @override
   */
  async _onDropItemCreate(itemData) {
    // On clone les données pour pouvoir les modifier en toute sécurité
    let itemsToCreate = Array.isArray(itemData) ? foundry.utils.deepClone(itemData) : [foundry.utils.deepClone(itemData)];

    if (itemsToCreate.some(data => data.type === "traitSpecial") && this.actor.type !== "pnj") {
      ui.notifications.warn("Les Traits Spéciaux sont réservés aux PNJ.");
      itemsToCreate = itemsToCreate.filter(data => data.type !== "traitSpecial");
      if (!itemsToCreate.length) return;
    }

    for (const data of itemsToCreate) {
      // SÉCURITÉ ABSOLUE : On efface l'ID d'origine pour forcer une nouvelle création propre
      delete data._id;

      if (["consommable", "materiel"].includes(data.type)) {
        const maxUsages = data.type === "consommable"
          ? data.system?.charges
          : data.system?.usagesMax;
        foundry.utils.setProperty(data, "flags.lore-and-legacy.usagesActuels", maxUsages ?? 0);
      }
    }

    const peupleItemData = itemsToCreate.find(i => i.type === "peuple");
    
    if (peupleItemData) {
      const existingPeuples = this.actor.items.filter(i => i.type === "peuple");
      const existingRacialTraits = this.actor.items.filter(i => i.getFlag("lore-and-legacy", "isRacialTrait"));
      
      const idsToDelete = [
        ...existingPeuples.map(i => i.id),
        ...existingRacialTraits.map(i => i.id)
      ];

      if (idsToDelete.length > 0) {
        await this.actor.deleteEmbeddedDocuments("Item", idsToDelete);
        ui.notifications.info("L'ancien Peuple et ses Traits ont été remplacés.");
      }

      const traitsUuids = peupleItemData.system?.traits || [];
      for (let uuid of traitsUuids) {
        const traitUuid = this._normalizeTraitUuid(uuid);
        const traitDoc = traitUuid ? await fromUuid(traitUuid) : null;
        if (traitDoc) {
          let traitData = traitDoc.toObject();
          delete traitData._id; // On efface aussi l'ID pour les Traits !
          foundry.utils.setProperty(traitData, "flags.lore-and-legacy.isRacialTrait", true);
          itemsToCreate.push(traitData);
        }
      }
    }

    return super._onDropItemCreate(itemsToCreate);
  }

  _normalizeTraitUuid(uuid) {
    if (typeof uuid !== "string" || !uuid) return null;
    if (uuid.startsWith("Compendium.")) return uuid;
    if (uuid.startsWith("Item.")) return `Compendium.lore-and-legacy.traits.${uuid}`;
    return null;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.capacite-roll').click(this._onRollCapacite.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.item-use').click(this._onItemUse.bind(this));
    html.find('.inline-checkbox').change(this._onToggleCheckbox.bind(this));
    
    // Sauvegarde immédiate du score de capacité dès qu'il est modifié
    html.find('.item-valeur').change(this._onItemValueChange.bind(this));
    // Clic sur le nom d'un Attribut
    html.find('.attribut-roll').click(this._onRollAttribut.bind(this));
  }

  async _onRollCapacite(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    await this.actor.rollCapacite(itemId);
  }

  /**
   * Gestionnaire pour le lancer d'un Attribut pur
   */
  async _onRollAttribut(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.attr;
    await this.actor.rollAttribut(attrKey);
  }

  /**
   * Ouvre la boîte de dialogue de choix de capacité
   */
  async _onOpenCapaciteDialog(event) {
    event.preventDefault();

    let optionsHtml = LISTE_CAPACITES.map((c, index) => {
      const attrLabel = c.attr ? ` (${c.attr.toUpperCase()})` : " (AUCUN)";
      return `<option value="${index}">${c.name}${attrLabel}</option>`;
    }).join("");

    const dialogContent = `
      <form class="dialog-form">
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-weight: bold;">Choisir une Capacité :</label>
          <select id="capacite-select" style="width: 100%; height: 30px; margin-top: 5px;">
            ${optionsHtml}
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: "Ajouter une Capacité à la fiche",
      content: dialogContent,
      buttons: {
        add: {
          icon: '<i class="fas fa-check"></i>',
          label: "Ajouter",
          callback: async (html) => {
            const selectedIndex = html.find('#capacite-select').val();
            const selectedCapa = LISTE_CAPACITES[selectedIndex];

            const existing = this.actor.items.find(i => i.type === "capacite" && i.name === selectedCapa.name);
            if (existing) {
              ui.notifications.warn(`La capacité ${selectedCapa.name} est déjà présente sur la fiche.`);
              return;
            }

            await Item.create({
              name: selectedCapa.name,
              type: "capacite",
              system: {
                valeur: 1,
                attributLie: selectedCapa.attr,
                passif: selectedCapa.passif || false
              }
            }, { parent: this.actor });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "add"
    }).render(true);
  }

  /**
   * Sauvegarde directement le score de la capacité dans l'Item
   */
  async _onItemValueChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const itemId = $(input).closest('.item').data('item-id');
    const item = this.actor.items.get(itemId);
    if (item) {
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 0;
      val = Math.min(Math.max(val, 0), 15); // Borne la valeur entre 0 et 15
      await item.update({ "system.valeur": val });
    }
  }

  async _onToggleCheckbox(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const itemId = $(target).closest('.item').data('item-id');
    const field = target.dataset.field; // "equipe", "soigne", "fortune", etc.
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const newValue = target.checked;

    // --- GESTION DE L'EXCLUSIVITÉ (Armes, Armures, Boucliers) ---
    if (field === "equipe" && newValue === true) {
      
      // On détecte la physiologie et les talents du personnage
      const peuple = this.actor.peupleNom ? this.actor.peupleNom.toLowerCase() : "";
      const isAgamide = peuple.includes("agamide");
      const hasAmbidextrie = this.actor.items.some(i => i.type === "capacite" && i.name.toLowerCase().includes("ambidextrie") && i.system.valeur > 0);
      
      const isWeapon = item.type === "arme" || (item.type === "arcanotech" && ["armeMelee", "armeTir"].includes(item.system.sousType));
      const isShield = item.type === "armure" && item.system.type === "bouclier";

      const updates = [];

      // 1. RÈGLES DES ARMURES ET BOUCLIERS
      if (item.type === "armure") {
        const itemCat = item.system.type; 
        const isMainArmor = ["legere", "lourde"].includes(itemCat);

        for (let otherItem of this.actor.items) {
          if (otherItem.id === item.id) continue;
          if (otherItem.type === "armure" && otherItem.system.equipe) {
            const otherCat = otherItem.system.type;
            if ((isMainArmor && ["legere", "lourde"].includes(otherCat)) || (!isMainArmor && otherCat === itemCat)) {
              updates.push({ _id: otherItem.id, "system.equipe": false });
            }
          }
        }
        
        // Si on équipe un bouclier et qu'on n'est pas Agamide, on lâche l'arme à 2 Mains !
        if (isShield && !isAgamide) {
          const equippedWeapons = this.actor.items.filter(i => (i.type === "arme" || (i.type === "arcanotech" && ["armeMelee", "armeTir"].includes(i.system.sousType))) && i.system.equipe);
          for (let w of equippedWeapons) {
            if (w.system.mains === "2M") {
              updates.push({ _id: w.id, "system.equipe": false });
              ui.notifications.warn("Le bouclier a déséquipé votre arme à 2 mains.");
            }
          }
        }
      }

      // 2. RÈGLES DES ARMES
      if (isWeapon) {
        // (Par sécurité, si un Arcanotech n'a pas le champ 'mains', on considère que c'est 1M)
        const is2M = item.system.mains === "2M"; 
        
        const equippedWeapons = this.actor.items.filter(i => 
          i.id !== item.id && 
          (i.type === "arme" || (i.type === "arcanotech" && ["armeMelee", "armeTir"].includes(i.system.sousType))) && 
          i.system.equipe
        );

        // Si on équipe une arme 2M et qu'on n'est pas Agamide, on lâche le bouclier !
        if (is2M && !isAgamide) {
          const equippedShield = this.actor.items.find(i => i.type === "armure" && i.system.type === "bouclier" && i.system.equipe);
          if (equippedShield) {
            updates.push({ _id: equippedShield.id, "system.equipe": false });
            ui.notifications.warn("L'arme à 2 mains a déséquipé votre bouclier.");
          }
        }

        const maxWeapons = (hasAmbidextrie || isAgamide) ? 2 : 1;

        if (maxWeapons === 1) {
          // Standard : On déséquipe toutes les autres armes
          if (equippedWeapons.length > 0) {
            for (let w of equippedWeapons) {
              updates.push({ _id: w.id, "system.equipe": false });
            }
            ui.notifications.warn("Le Trait Ambidextrie requis pour équiper une seconde arme. L'arme précédente a été déséquipée.");
          }
        } else if (maxWeapons === 2) {
          // Si on a déjà 2 armes en main, on déséquipe la plus ancienne pour faire de la place
          if (equippedWeapons.length >= 2) {
            updates.push({ _id: equippedWeapons[0].id, "system.equipe": false });
            equippedWeapons.shift(); 
          }

          if (!isAgamide) { 
            // Ambidextrie normale : Toutes les armes DOIVENT être à 1 Main
            if (is2M) {
              // Si on équipe une 2M, on lâche TOUT le reste
              if (equippedWeapons.length > 0) {
                for (let w of equippedWeapons) {
                  updates.push({ _id: w.id, "system.equipe": false });
                }
                ui.notifications.warn("Une arme à 2 mains nécessite vos deux mains. Vos autres armes ont été déséquipées.");
              }
            } else {
              // Si on équipe une 1M, on s'assure qu'on ne tient pas de 2M dans l'autre main
              let dropped2M = false;
              for (let w of equippedWeapons) {
                if (w.system.mains === "2M") {
                  updates.push({ _id: w.id, "system.equipe": false });
                  dropped2M = true;
                }
              }
              if (dropped2M) {
                ui.notifications.warn("Votre arme à 2 mains a été déséquipée pour libérer une main.");
              }
            }
          }
        }
      }

      if (updates.length > 0) {
        await this.actor.updateEmbeddedDocuments("Item", updates);
      }
    }

    // Mise à jour de l'objet cliqué
    await item.update({ [`system.${field}`]: newValue });
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    const item = this.actor.items.get(itemId);
    if (item) await item.delete();
  }

  async _onItemUse(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const usagesMax = item.type === "consommable" ? item.system.charges : item.system.usagesMax;
    const usages = item.getFlag("lore-and-legacy", "usagesActuels") ?? usagesMax;
    if (usages <= 1) {
      await item.delete();
      return;
    }

    await item.setFlag("lore-and-legacy", "usagesActuels", usages - 1);
  }
}

/**
 * Fiche simplifiée et manuelle pour les PNJ / Monstres
 */
export class LoreAndLegacyPNJSheet extends LoreAndLegacyActorSheet {
  
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lore-and-legacy", "sheet", "actor", "pnj"],
      template: "systems/lore-and-legacy/templates/actor/actor-pnj-sheet.html",
      width: 550,
      height: 700,
      tabs: [] // Aucun onglet !
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    return context;
  }
  
  activateListeners(html) {
    super.activateListeners(html);
  }

  async _onRollCapacite(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    const capacite = this.actor.items.get(itemId);
    if (!capacite) return;

    new Dialog({
      title: `Jet de capacité : ${capacite.name}`,
      content: `
        <form>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="fortune"/>
              Dé de Fortune (+1D10)
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="adversite"/>
              Dé d'Adversité (-1D10)
            </label>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d10"></i>',
          label: "Lancer le jet",
          callback: async html => {
            await this.actor.rollCapacite(itemId, {
              fortune: html.find('[name="fortune"]').prop('checked'),
              adversite: html.find('[name="adversite"]').prop('checked')
            });
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "roll"
    }).render(true);
  }

  async _onRollAttribut(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.attr;
    const attributValue = this.actor.system.attributs[attrKey]?.value || 0;
    
    let roll = new Roll(`1d6 + ${attributValue}`);
    await roll.evaluate();
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: `Jet de ${attrKey.toUpperCase()}` });
  }
}