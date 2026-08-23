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
    const sortileges = [];
    const pouvoirs = [];
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
      if (item.type === "sortilege") sortileges.push(itemData);

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

      if (item.type === "pouvoir" || item.type === "sortilege") {
        pouvoirs.push(itemData);
      }
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
    context.sortileges = sortileges.sort((a, b) => a.name.localeCompare(b.name));
    context.pouvoirs = pouvoirs.sort((a, b) => a.name.localeCompare(b.name));
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
    html.find('.sortilege-roll').click(this._onRollSortilege.bind(this));
    html.find('.arme-attack-roll').click(this._onRollArme.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.item-use').click(this._onItemUse.bind(this));
    html.find('.inline-checkbox').change(this._onToggleCheckbox.bind(this));
    html.find('.item-valeur').change(this._onItemValueChange.bind(this));
    html.find('.attribut-roll').click(this._onRollAttribut.bind(this));

// --- GESTION DU BOUTON BIVOUAC ---
    html.find('.action-bivouac').click(ev => {
      ev.preventDefault();
      
      const actor = this.actor;
      
      // Contenu HTML de la boîte de dialogue
      const dialogContent = `
      <form autocomplete="off">
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-weight: bold; color:black;">Repas partagé :</label>
          <select id="repas-choice" style="width: 100%;">
            <option value="rien">Rien / Jeûne (Aucun soin)</option>
            <option value="normal">Repas Normal (Gain: 1D8 + 2)</option>
            <option value="raffine">Mets Raffinés (Gain: 1D8 + 4)</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-weight: bold; color:black;">Sécurité du lieu :</label>
          <select id="lieu-choice" style="width: 100%;">
            <option value="tranquille">Tranquille (Difficulté 6)</option>
            <option value="dangereux">Dangereux (Difficulté 12)</option>
          </select>
        </div>
        <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
          <label style="font-weight: bold; color:black;">Pratiquer sa Passion ?</label>
          <input type="checkbox" id="passion-check" checked />
        </div>
      </form>
    `;

      new Dialog({
        title: `Bivouac de ${actor.name}`,
        content: dialogContent,
        buttons: {
          repos: {
            icon: '<i class="fas fa-campground"></i>',
            label: "Se reposer",
            callback: async (html) => {
              // On uniformise les noms de variables !
              const repas = html.find('#repas-choice').val();
              const lieu = html.find('#lieu-choice').val();
              const passion = html.find('#passion-check').is(':checked');

              // On utilise bien chatContent partout
              let chatContent = `<h3 style="border-bottom: 2px solid #c19a5b; padding-bottom: 5px; margin-bottom: 10px;">🏕️ Bivouac de ${actor.name}</h3>`;

              // --- 1. GESTION DU REPAS (Soins Aléatoires) ---
              if (repas !== "rien") {
                const formule = repas === "normal" ? "1d8+2" : "1d8+4";
                // L'ajout de {async: true} sécurise la compatibilité de Foundry
                const repasRoll = await new Roll(formule).evaluate({async: true});
                const soin = repasRoll.total;
                
                chatContent += `<p>🍽️ <b>Repas :</b> ${repas === "normal" ? "Normal" : "Raffiné"}<br>Gain de <b>${soin}</b> PV et PM.</p>`;
                
                // Mise à jour de la fiche sans dépasser le Maximum
                const sec = actor.system.secondaires;
                const nouveauxPV = Math.min(sec.pv.value + soin, sec.pv.max);
                const nouveauxPM = Math.min(sec.pm.value + soin, sec.pm.max);
                
                await actor.update({
                  "system.secondaires.pv.value": nouveauxPV,
                  "system.secondaires.pm.value": nouveauxPM
                });
                
                // Affiche le jet de soin dans le Chat
                await repasRoll.toMessage({ 
                  speaker: ChatMessage.getSpeaker({ actor: actor }), 
                  flavor: `Soin du Bivouac (${repas === "normal" ? "Repas Normal" : "Mets Raffinés"})` 
                });
              } else {
                chatContent += `<p>🍽️ <b>Repas :</b> Aucun (Jeûne).</p>`;
              }

              // --- 2. GESTION DE LA PASSION (Jet de Fortune) ---
              if (passion) {
                const diff = lieu === "tranquille" ? 6 : 12;
                
                // On cherche la capacité "Passion" pour récupérer son score (s'il l'a augmentée)
                const passionItem = actor.items.find(i => i.type === "capacite" && i.name.toLowerCase().includes("passion"));
                const scorePassion = passionItem ? passionItem.system.valeur : 0;
                
                const passionRoll = await new Roll(`1d10 + ${scorePassion}`).evaluate({async: true});
                const reussite = passionRoll.total >= diff;
                
                chatContent += `<p>🎨 <b>Passion :</b> Lieu ${lieu} (Difficulté ${diff})<br>`;
                
                if (reussite) {
                  chatContent += `<span style="color: #2b7a4b; font-weight: bold;">Réussite !</span> Restauration totale de la Fortune.</p>`;
                  const fortuneMax = actor.system.attributs.fortune.total || 0;
                  await actor.update({ "system.attributs.fortune.value": fortuneMax });
                } else {
                  chatContent += `<span style="color: #b32424; font-weight: bold;">Échec.</span> L'esprit tourmenté, aucune Fortune n'est récupérée.</p>`;
                }
                
                // Affiche le jet de Passion dans le Chat
                await passionRoll.toMessage({ 
                  speaker: ChatMessage.getSpeaker({ actor: actor }), 
                  flavor: `Jet de Passion (Lieu ${lieu})` 
                });
              }

              // --- 3. RÉCAPITULATIF GLOBAL ---
              ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: chatContent
              });
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Annuler"
          }
        },
        default: "repos"
      }).render(true);
    });
  }

  async _onRollCapacite(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    await this.actor.rollCapacite(itemId);
  }

  async _onRollSortilege(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    
    // On appelle directement la nouvelle machinerie magique de actor.mjs !
    await this.actor.rollSortilege(itemId);
  }
  
  /**
   * Gestionnaire pour le lancer d'une Arme
   */
  async _onRollArme(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    await this.actor.rollArme(itemId);
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

  async _onPNJArmeAdd(event) {
    event.preventDefault();
    const armes = (this.actor.system.armesPNJ || []).map(arme => ({
      nom: arme.nom,
      cd: Number(arme.cd || 0)
    }));
    armes.push({ nom: "Nouvelle arme", cd: 0 });
    await this.actor.update({ "system.armesPNJ": armes });
  }

  async _onPNJArmeDelete(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const armes = (this.actor.system.armesPNJ || []).map(arme => ({
      nom: arme.nom,
      cd: Number(arme.cd || 0)
    }));
    if (!Number.isInteger(index) || index < 0 || index >= armes.length) return;
    armes.splice(index, 1);
    await this.actor.update({ "system.armesPNJ": armes });
  }

  async _onPNJArmeChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    const armes = (this.actor.system.armesPNJ || []).map(arme => ({
      nom: arme.nom,
      cd: Number(arme.cd || 0)
    }));
    if (!Number.isInteger(index) || !armes[index]) return;

    if (field === "nom") armes[index].nom = input.value;
    if (field === "cd") armes[index].cd = Number(input.value) || 0;
    await this.actor.update({ "system.armesPNJ": armes });
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
      width: 700,
      height: 700,
      tabs: [] // Aucun onglet !
    });
  }

  async getData() {
    const context = await super.getData();
    context.system = this.actor.system;
    context.pnjSprint = Number(this.actor.system.secondaires.rapidite.value || 0) * 2;
    return context;
  }
  
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.pnj-arme-add').click(this._onPNJArmeAdd.bind(this));
    html.find('.pnj-arme-delete').click(this._onPNJArmeDelete.bind(this));
    html.find('.pnj-arme-roll').click(this._onPNJArmeRoll.bind(this));
    html.find('.pnj-arme-field').change(this._onPNJArmeChange.bind(this));
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
    const nomsFormates = {
      caractere: "Caractère", discernement: "Discernement", maitrise: "Maîtrise",
      prestance: "Prestance", robustesse: "Robustesse", vigueur: "Vigueur", fortune: "Fortune"
    };
    const nomAffiche = nomsFormates[attrKey] || attrKey;

    new Dialog({
      title: `Jet d'attribut : ${nomAffiche}`,
      content: `
        <form>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="fortune"/>
              Dé de Fortune (+1D6)
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="adversite"/>
              Dé d'Adversité (-1D6)
            </label>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d6"></i>',
          label: "Lancer le jet",
          callback: async html => {
            await this.actor.rollAttribut(attrKey, {
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

  async _onPNJArmeRoll(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const arme = this.actor.system.armesPNJ?.[index];
    if (!arme || !arme.nom) return;

    new Dialog({
      title: `Jet de dégâts : ${arme.nom}`,
      content: `
        <form>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="fortune"/>
              Dé de Fortune (+1D8)
            </label>
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="adversite"/>
              Dé d'Adversité (-1D8)
            </label>
          </div>
        </form>
      `,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d8"></i>',
          label: "Lancer le jet",
          callback: async html => {
            await this.actor.rollPNJArme(index, {
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
}