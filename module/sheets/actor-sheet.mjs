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
      width: 700,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "caracteristiques" }]
    });
  }

  /** @override */
  async getData() {
    // Récupère les données de base de Foundry
    const context = super.getData();
    
    // Raccourci pour accéder facilement aux données système dans le HTML
    context.system = context.data.system;

    return context;
  }
}
