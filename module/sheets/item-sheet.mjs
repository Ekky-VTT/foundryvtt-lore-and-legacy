/**
 * Classe gérant les fiches d'Objets (Items) de Lore & Legacy.
 * @extends {ItemSheet}
 */
export class LoreAndLegacyItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lore-and-legacy", "sheet", "item"],
      width: 620,
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

    if (item.type === "sortilege") {
      context.typeMagieLabel = {
        illusoire: "Magie Illusoire",
        materielle: "Magie Matérielle",
        rituelle: "Magie Rituelle",
        "magie-personnelle": "Magie Personnelle"
      }[item.system.typeMagie] || "Sortilège";
    }
      
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

    html.find('select[name="system.typeConsommable"]').change(event => {
      const isPoison = event.currentTarget.value === "poison";
      html.find(".nocivite-field").toggleClass("is-visible", isPoison);
    });

    if (this.item.type === "sortilege") {
      const updateSortilegeFields = typeMagie => {
        html.find(".sortilege-cout-pm").toggle(typeMagie !== "rituelle");
        html.find(".sortilege-materiel").toggleClass("is-visible", ["materielle", "rituelle", "magie-personnelle"].includes(typeMagie));
        html.find(".sortilege-rituel").toggleClass("is-visible", typeMagie === "rituelle");

        const cibleSelect = html.find('select[name="system.cible"]');
        const difficulteInput = html.find('input[name="system.difficulte"]');

        if (typeMagie === "magie-personnelle") {
          cibleSelect.val("personnelle").css("pointer-events", "none").css("opacity", "0.6");
          difficulteInput.val("8").css("pointer-events", "none").css("opacity", "0.6");
        } else {
          cibleSelect.css("pointer-events", "auto").css("opacity", "1");
          difficulteInput.css("pointer-events", "auto").css("opacity", "1");
        }
      };

      const typeSelect = html.find('select[name="system.typeMagie"]');
      updateSortilegeFields(typeSelect.val());
      
      typeSelect.change(event => {
        const newType = event.currentTarget.value;
        if (newType === "magie-personnelle") {
            this.item.update({
                "system.typeMagie": "magie-personnelle",
                "system.cible": "personnelle",
                "system.difficulte": "8"
            });
        } else {
            updateSortilegeFields(newType);
        }
      });
    }

    // NOUVEAU : Supprimer un Trait du Peuple
    html.find('.trait-delete').click(async ev => {
      const uuidToRemove = ev.currentTarget.dataset.uuid;
      Dialog.confirm({
        title: "Confirmation de suppression",
        content: `<p>Êtes-vous sûr de vouloir supprimer ce trait ?</p>`,
        yes: async () => {
          const currentTraits = this.item.system.traits || [];
          // On garde tous les UUIDs SAUF celui qu'on veut supprimer
          const newTraits = currentTraits.filter(uuid => uuid !== uuidToRemove);
          await this.item.update({ "system.traits": newTraits });
        },
        no: () => {},
        defaultYes: false
      });
    });
  }

  _normalizeTraitUuid(uuid) {
    if (typeof uuid !== "string" || !uuid) return null;
    if (uuid.startsWith("Compendium.")) return uuid;
    if (uuid.startsWith("Item.")) return `Compendium.lore-and-legacy.traits.${uuid}`;
    return uuid;
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
      const normalizedDroppedUuid = this._normalizeTraitUuid(droppedItem.uuid);
      
      // On normalise les traits existants pour vérifier les doublons
      const normalizedCurrentTraits = currentTraits.map(uuid => this._normalizeTraitUuid(uuid));
      
      // On évite les doublons
      if (!normalizedCurrentTraits.includes(normalizedDroppedUuid)) {
        // Optionnel : on peut nettoyer la liste des doublons au passage
        const newTraits = [...new Set(currentTraits), droppedItem.uuid];
        await this.item.update({ "system.traits": newTraits });
      } else {
        ui.notifications.warn("Ce Trait est déjà assigné à ce Peuple.");
      }
    }
  }
}
