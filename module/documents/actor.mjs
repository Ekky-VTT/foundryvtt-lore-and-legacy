/**
 * Classe personnalisée pour les Acteurs de Lore & Legacy
 * @extends {Actor}
 */
export class LoreAndLegacyActor extends Actor {

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const systemData = this.system;
    if (this.type === "personnage" || this.type === "pnj") {
      this._preparePersonnageData(systemData);
    }
  }

  /** @private */
  _preparePersonnageData(systemData) {
    const attr = systemData.attributs;
    const sec = systemData.secondaires;

    const caractere = attr.caractere.value || 0;
    const discernement = attr.discernement.value || 0;
    const maitrise = attr.maitrise.value || 0;
    const prestance = attr.prestance.value || 0;
    const robustesse = attr.robustesse.value || 0;
    const vigueur = attr.vigueur.value || 0;
    const fortune = attr.fortune.value || 0;

    sec.pv.max = (robustesse + vigueur) * 2;
    sec.pm.max = (caractere + discernement) * 2;
    sec.resPhys.value = robustesse * 3;
    sec.resMag.value = (discernement + maitrise) * 2;
    sec.resMent.value = (caractere + prestance) * 2;
    sec.rdc.max = fortune + vigueur;
    sec.sb.value = robustesse * 2;
    sec.rapidite.value = maitrise + vigueur;
    sec.poids.value = sec.resPhys.value * 10;
    sec.bagage.max = 18;
  }

/**
   * Effectue un jet de Capacité (ou d'Attribut en repli) avec Fortune/Adversité
   * @param {string} itemId - L'ID de l'objet Capacité cliqué
   */
  async rollCapacite(itemId) {
    const capacite = this.items.get(itemId);
    if (!capacite || capacite.type !== "capacite") return;

    const capaciteValue = capacite.system.valeur;
    const attributLieKey = capacite.system.attributLie; 
    const attributValue = (attributLieKey && this.system.attributs[attributLieKey]) ? this.system.attributs[attributLieKey].value : 0;
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    let formula = "";
    let flavorText = "";

    // 1. Déterminer le dé de base (1D10 + Capa ou 1D6 + Attribut)
    if (capaciteValue > 0) {
      formula = `1d10 + ${capaciteValue}`;
      flavorText = `Jet de Capacité : <b>${capacite.name}</b>`;
    } else {
      formula = `1d6 + ${attributValue}`;
      flavorText = `Jet de repli (sans <b>${capacite.name}</b>) : Attribut <b>${attributNom}</b>`;
    }

    // 2. Gestion du Dé de Fortune (+1D6)
    if (capacite.system.fortune) {
      formula += ` + 1d6`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    // 3. Gestion du Dé d'Adversité (-1D6)
    if (capacite.system.adversite) {
      formula += ` - 1d6`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>`;
    }

    // 4. Lancement du jet
    let roll = new Roll(formula);
    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavorText
    });
  }
}
