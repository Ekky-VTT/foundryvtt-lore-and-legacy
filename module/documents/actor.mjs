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
   * Effectue un jet de Capacité (ou d'Attribut en repli)
   * @param {string} itemId - L'ID de l'objet Capacité cliqué
   */
  async rollCapacite(itemId) {
    // 1. On récupère la capacité depuis l'inventaire du personnage
    const capacite = this.items.get(itemId);
    if (!capacite || capacite.type !== "capacite") return;

    // 2. On récupère les valeurs nécessaires
    const capaciteValue = capacite.system.valeur;
    const attributLieKey = capacite.system.attributLie; 
    
    // Si la capacité n'a pas d'attribut lié (ex: Passion), on met 0 par défaut
    const attributValue = attributLieKey ? this.system.attributs[attributLieKey].value : 0;
    
    // On prépare le nom de l'attribut pour l'affichage (ex: "caractere" devient "Caractere")
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    // 3. Construction de la formule selon les règles du Moteur 3d
    let formula = "";
    let flavorText = "";

    if (capaciteValue > 0) {
      // Le personnage a la capacité : 1D10 + Capacité
      formula = `1d10 + ${capaciteValue}`;
      flavorText = `Jet de Capacité : <b>${capacite.name}</b>`;
    } else {
      // Le personnage n'a pas la capacité : Jet de repli sur l'attribut (1D6 + Attribut)
      formula = `1d6 + ${attributValue}`;
      flavorText = `Jet de repli (sans <b>${capacite.name}</b>) : Attribut <b>${attributNom}</b>`;
    }

    // 4. Lancement des dés et envoi dans le chat
    let roll = new Roll(formula);
    await roll.evaluate(); // .evaluate({async: true}) n'est plus nécessaire en v12+

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavorText
    });
  }
}
