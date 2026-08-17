/**
 * Classe gérant les fiches d'Objets (Items) de Lore & Legacy.
 * @extends {ItemSheet}
 */
export class LoreAndLegacyItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lore-and-legacy", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }], 
      dragDrop: [{ dragSelector: ".item", dropSelector: "form" }]
    });
  }

  /**
   * Assigne dynamiquement le bon fichier HTML selon le type d'objet (trait, capacite...)
   * @override
   */
  get template() {
    return `systems/lore-and-legacy/templates/item/item-${this.item.type}-sheet.html`;
  }

 /** @override */
  async getData(options) {
    const context = await super.getData(options);
    const item = context.item;
    
    // On extrait les données propres pour le HTML sans casser l'objet vivant
    const source = item.toObject();
    context.system = source.system;
    
    // On transmet nativement la permission d'édition au HTML
    context.editable = this.isEditable;
    
    // Si c'est un Peuple, on prépare la liste visuelle des Traits
    if (item.type === "peuple") {
      context.traitsList = [];
      const traitsUuids = item.system.traits || []; 
      
      for (let uuid of traitsUuids) {
        const traitItem = await fromUuid(uuid);
        if (traitItem) {
          context.traitsList.push({
            uuid: uuid,
            name: traitItem.name,
            img: traitItem.img
          });
        }
      }
    }

    // Préparation sécurisée de la description
    const descriptionBrute = item.system.description || "";
    context.enrichedDescription = await TextEditor.enrichHTML(descriptionBrute, { async: true });
    
    return context;
  }
  
  // AJOUTE PAR LE DRAG AND DROP
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // NOUVEAU : Supprimer un Trait du Peuple
    html.find('.trait-delete').click(async ev => {
      const uuidToRemove = ev.currentTarget.dataset.uuid;
      const currentTraits = this.item.system.traits || [];
      // On garde tous les UUIDs SAUF celui qu'on veut supprimer
      const newTraits = currentTraits.filter(uuid => uuid !== uuidToRemove);
      await this.item.update({ "system.traits": newTraits });
    });
  }

  /**
   * Intercepte le glisser-déposer d'un Item sur la fiche
   * @override
   */
  async _onDrop(event) {
    event.preventDefault();
    if (!this.isEditable) return;

    // On récupère les données lâchées par la souris
    const data = TextEditor.getDragEventData(event);
    if (data.type !== "Item") return;

    // On retrouve l'objet complet
    const droppedItem = await Item.fromDropData(data);
    if (!droppedItem) return;

    // Si on lâche un Trait sur un Peuple
    if (this.item.type === "peuple" && droppedItem.type === "trait") {
      const currentTraits = this.item.system.traits || [];
      
      // On évite les doublons
      if (!currentTraits.includes(droppedItem.uuid)) {
        const newTraits = [...currentTraits, droppedItem.uuid];
        await this.item.update({ "system.traits": newTraits });
      } else {
        ui.notifications.warn("Ce Trait est déjà assigné à ce Peuple.");
      }
    }
  }
}
