/**
 * Liste officielle des capacités de Lore & Legacy et leurs attributs liés
 */
const LISTE_CAPACITES = [
  // Caractère
  { name: "Concentration", attr: "caractere" },
  { name: "Domestication", attr: "caractere" },
  { name: "Esprit Critique", attr: "caractere" },
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
  { name: "Mysticisme", attr: "discernement" },
  { name: "Observation", attr: "discernement" },
  { name: "Réparation", attr: "discernement" },
  { name: "Sorcellerie", attr: "discernement" },
  // Maîtrise
  { name: "Acrobatie", attr: "maitrise" },
  { name: "Ambidextrie", attr: "maitrise" },
  { name: "Combat à distance", attr: "maitrise" },
  { name: "Combat rapproché", attr: "maitrise" },
  { name: "Dextérité", attr: "maitrise" },
  { name: "Esquive", attr: "maitrise" },
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
  { name: "Optimisation", attr: "prestance" },
  // Robustesse
  { name: "Endurance", attr: "robustesse" },
  { name: "Immunité", attr: "robustesse" },
  { name: "Monte", attr: "robustesse" },
  { name: "Natation", attr: "robustesse" },
  { name: "Pilotage de Karkan", attr: "robustesse" },
  { name: "Survie en milieu sauvage", attr: "robustesse" },
  { name: "Voyage", attr: "robustesse" },
  // Vigueur
  { name: "Armure Légère", attr: "vigueur" },
  { name: "Armure lourde", attr: "vigueur" },
  { name: "Bouclier", attr: "vigueur" },
  { name: "Charge", attr: "vigueur" },
  { name: "Effort", attr: "vigueur" },
  { name: "Escalade", attr: "vigueur" },
  { name: "Morsure", attr: "vigueur" },
  { name: "Musculation", attr: "vigueur" },
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
      height: 820
    });
  }

  /** @override */
  async getData() {
    const context = super.getData();
    context.system = context.data.system;
    this._prepareItems(context);
    return context;
  }

  _prepareItems(context) {
    const capacities = [];
    for (let item of context.items) {
      if (item.type === "capacite") capacities.push(item);
    }
    capacities.sort((a, b) => a.name.localeCompare(b.name));
    context.capacites = capacities;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.capacite-roll').click(this._onRollCapacite.bind(this));
    html.find('.item-create-capacite').click(this._onOpenCapaciteDialog.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.inline-checkbox').change(this._onToggleCheckbox.bind(this));
  }

  async _onRollCapacite(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('item-id');
    await this.actor.rollCapacite(itemId);
  }

  /**
   * Ouvre la boîte de dialogue de choix de capacité
   */
  async _onOpenCapaciteDialog(event) {
    event.preventDefault();

    // Génération des options du menu déroulant
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

            // Vérification si la capacité existe déjà sur l'acteur
            const existing = this.actor.items.find(i => i.type === "capacite" && i.name === selectedCapa.name);
            if (existing) {
              ui.notifications.warn(`La capacité ${selectedCapa.name} est déjà présente sur la fiche.`);
              return;
            }

            // Création de la capacité
            await Item.create({
              name: selectedCapa.name,
              type: "capacite",
              system: {
                valeur: 1, // On met 1 par défaut quand le joueur l'ajoute
                attributLie: selectedCapa.attr
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
}
