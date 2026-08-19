/**
 * Liste officielle des capacités de Lore & Legacy et leurs attributs liés
 */
const LISTE_CAPACITES = [
  // Caractère
  { name: "Concentration (P)", attr: "caractere", passif: true },
  { name: "Domestication", attr: "caractere" },
  { name: "Esprit Critique (P)", attr: "caractere", passif: true },
  { name: "Intimidation", attr: "caractere" },
  { name: "Provocation", attr: "caractere" },
  { name: "Rhétorique", attr: "caractere" },
  { name: "Spiritisme", attr: "caractere" },
  // Discernement
  { name: "Alchimie", attr: "discernement" },
  { name: "Arcanotech", attr: "discernement" },
  { name: "Archéologie", attr: "discernement" },
  { name: "Investigation", attr: "discernement" },
  { name: "Médecine", attr: "discernement" },
  { name: "Mysticisme (P)", attr: "discernement", passif: true },
  { name: "Observation", attr: "discernement" },
  { name: "Réparation", attr: "discernement" },
  { name: "Sorcellerie", attr: "discernement" },
  // Maîtrise
  { name: "Acrobatie", attr: "maitrise" },
  { name: "Ambidextrie", attr: "maitrise" },
  { name: "Combat à distance", attr: "maitrise" },
  { name: "Combat rapproché", attr: "maitrise" },
  { name: "Dextérité", attr: "maitrise" },
  { name: "Esquive (P)", attr: "maitrise", passif: true },
  { name: "Fabrication", attr: "maitrise" },
  { name: "Mécanique", attr: "maitrise" },
  // Prestance
  { name: "Charme", attr: "prestance" },
  { name: "Déguisement", attr: "prestance" },
  { name: "Discrétion", attr: "prestance" },
  { name: "Glamour", attr: "prestance" },
  { name: "Marchandage", attr: "prestance" },
  { name: "Présence Apaisante", attr: "prestance" },
  { name: "Représentation", attr: "prestance" },
  { name: "Optimisation (P)", attr: "prestance", passif: true },
  // Robustesse
  { name: "Endurance (P)", attr: "robustesse", passif: true },
  { name: "Immunité", attr: "robustesse" },
  { name: "Monte", attr: "robustesse" },
  { name: "Natation", attr: "robustesse" },
  { name: "Pilotage de Karkan", attr: "robustesse" },
  { name: "Survie en milieu sauvage", attr: "robustesse" },
  { name: "Voyage", attr: "robustesse" },
  // Vigueur
  { name: "Armure Légère (P)", attr: "vigueur", passif: true },
  { name: "Armure lourde (P)", attr: "vigueur", passif: true },
  { name: "Bouclier (P)", attr: "vigueur", passif: true },
  { name: "Charge", attr: "vigueur" },
  { name: "Effort", attr: "vigueur" },
  { name: "Escalade", attr: "vigueur" },
  { name: "Morsure", attr: "vigueur" },
  { name: "Musculation (P)", attr: "vigueur", passif: true },
  // Spécial
  { name: "Passion", attr: "" }
];

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
    const armes = [];
    const armures = [];
    const consommables = [];
    const materiels = [];
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

      // --- LES ARMES (Classiques) ---
      if (item.type === "arme") armes.push(itemData);

      // --- L'ARCANOTECH ---
      if (item.type === "arcanotech") {
        if (item.system.sousType === "armeMelee" || item.system.sousType === "armeTir") {
          // Si c'est une arme, elle va dans le tableau des armes !
          // On lui ajoute un petit tag "Arcanotech" dans le nom pour l'esthétique
          itemData.name = itemData.name + " (Arcanotech)";
          armes.push(itemData);
        } else {
          // Si c'est un artefact, il va dans le sac à dos (Matériel)
          itemData.usagesActuels = item.getFlag("lore-and-legacy", "usagesActuels") ?? item.system.durabilite ?? 1;
          itemData.usagesMax = item.system.durabilite || 1;
          materiels.push(itemData);
        }
      }

      // --- LES ARMURES ---
      if (item.type === "armure") {
        const categories = { legere: "Armure légère", lourde: "Armure lourde", bouclier: "Bouclier", accessoire: "Accessoire" };
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
    }
    
    // Tris et assignations au contexte
    context.capacites = capacities.sort((a, b) => a.name.localeCompare(b.name));
    context.traits = traits.sort((a, b) => a.name.localeCompare(b.name));
    context.armes = armes.sort((a, b) => a.name.localeCompare(b.name));
    
    context.armures = armures.sort((a, b) => {
      const categoryOrder = ["Armure légère", "Armure lourde", "Bouclier", "Accessoire"];
      return categoryOrder.indexOf(a.categorieArmure) - categoryOrder.indexOf(b.categorieArmure) || a.name.localeCompare(b.name);
    });
    
    context.armures.forEach((arm, index, liste) => {
      arm.afficherCategorie = index === 0 || arm.categorieArmure !== liste[index - 1].categorieArmure;
    });
    
    context.consommables = consommables.sort((a, b) => a.name.localeCompare(b.name));
    context.materiels = materiels.sort((a, b) => a.name.localeCompare(b.name));
  }

/**
   * Intercepte uniquement la CRÉATION finale des objets déposés.
   * Le "Drop" en lui-même est géré par Foundry en amont.
   * @override
   */
  async _onDropItemCreate(itemData) {
    // On clone les données pour pouvoir les modifier en toute sécurité
    let itemsToCreate = Array.isArray(itemData) ? foundry.utils.deepClone(itemData) : [foundry.utils.deepClone(itemData)];

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
        const traitDoc = await fromUuid(uuid);
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.capacite-roll').click(this._onRollCapacite.bind(this));
    html.find('.item-create-capacite').click(this._onOpenCapaciteDialog.bind(this));
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
    const field = target.dataset.field;
    const item = this.actor.items.get(itemId);
    if (item) {
      await item.update({ [`system.${field}`]: target.checked });
    }
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
