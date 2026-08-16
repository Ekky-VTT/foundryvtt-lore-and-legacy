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
    const context = super.getData(options);
    const item = context.item;
    const source = item.toObject();

    context.system = source.system;
    
    // Si c'est un Peuple, on prépare la liste visuelle des Traits
    if (item.type === "peuple") {
      context.traitsList = [];
      const traitsUuids = context.system.traits || [];
      
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

    context.enrichedDescription = await TextEditor.enrichHTML(item.system.description, {async: true});
    return context;
  }
}
