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
    const traits = [];
    const attributs = context.system.attributs;

    for (let item of context.items) {
      // Tri des Capacités
      if (item.type === "capacite") {
        const attrLie = item.system.attributLie;
        const parentFortune = (attrLie && attributs[attrLie]) ? attributs[attrLie].fortune : false;
        const parentAdversite = (attrLie && attributs[attrLie]) ? attributs[attrLie].adversite : false;

        item.displayFortune = item.system.fortune || parentFortune;
        item.displayAdversite = item.system.adversite || parentAdversite;
        item.lockFortune = parentFortune; 
        item.lockAdversite = parentAdversite;

        capacities.push(item);
      }
      
      // Tri des Traits
      if (item.type === "trait") {
        traits.push(item);
      }
    }
    
    capacities.sort((a, b) => a.name.localeCompare(b.name));
    traits.sort((a, b) => a.name.localeCompare(b.name));
    
    context.capacites = capacities;
    context.traits = traits;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.capacite-roll').click(this._onRollCapacite.bind(this));
    html.find('.item-create-capacite').click(this._onOpenCapaciteDialog.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
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
}
