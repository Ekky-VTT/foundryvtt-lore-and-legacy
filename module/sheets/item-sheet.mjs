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
      height: 480
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
  async getData() {
    const context = super.getData();
    context.system = context.data.system;
    
    // NOUVEAU : On vérifie si l'utilisateur est le Meneur de Jeu
    context.isGM = game.user.isGM;

    // NOUVEAU : On enrichit le texte pour supporter le HTML de Foundry (liens, gras, etc.)
    context.enrichedDescription = await TextEditor.enrichHTML(context.system.description, { async: true });

    return context;
  }
}
