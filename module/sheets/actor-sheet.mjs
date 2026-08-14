/**
 * Classe gérant la fiche de personnage Lore & Legacy.
 * @extends {ActorSheet}
 */
export class LoreAndLegacyActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lore-and-legacy", "sheet", "actor"],
      template: "systems/lore-and-legacy/templates/actor/actor-personnage-sheet.html",
      width: 720,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "caracteristiques" }]
    });
  }

  /** @override */
  async getData() {
    const context = super.getData();
    context.system = context.data.system;

    // Préparation des objets (Capacités, Traits, etc.)
    this._prepareItems(context);

    return context;
  }

  /**
   * Trie les objets possédés par le personnage par type
   * @param {Object} context 
   * @private
   */
  _prepareItems(context) {
    const capacities = [];

    for (let item of context.items) {
      if (item.type === "capacite") {
        capacities.push(item);
      }
    }

    // On trie les capacités par ordre alphabétique
    capacities.sort((a, b) => a.name.localeCompare(b.name));

    context.capacites = capacities;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Clic sur le bouton de jet de Capacité
    html.find('.capacite-roll').click(this._onRollCapacite.bind(this));

    // Créer une nouvelle capacité directement depuis la fiche
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Supprimer une capacité
    html.find('.item-delete').click(this._onItemDelete.bind(this));
  }

  /**
   * Gestionnaire pour le lancer de capacité
   */
  async _onRollCapacite(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    await this.actor.rollCapacite(itemId);
  }

  /**
   * Gestionnaire pour ajouter un item rapide (ex: Capacité)
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const type = $(event.currentTarget).data('type');
    const itemData = {
      name: `Nouvelle ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type: type
    };
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Gestionnaire pour supprimer un item
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    const item = this.actor.items.get(itemId);
    if (item) await item.delete();
  }
}
