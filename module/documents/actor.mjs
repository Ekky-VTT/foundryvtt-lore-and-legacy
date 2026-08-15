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
    const eq = systemData.equipementActif;

    const caractere = attr.caractere.value || 0;
    const discernement = attr.discernement.value || 0;
    const maitrise = attr.maitrise.value || 0;
    const prestance = attr.prestance.value || 0;
    const robustesse = attr.robustesse.value || 0;
    const vigueur = attr.vigueur.value || 0;
    const fortune = attr.fortune.value || 0;

    // --- 1. SCAN DE TOUTES LES CAPACITÉS PASSIVES ---
    let bonusEndurance = 0;
    let bonusConcentration = 0;
    let bonusMysticisme = 0;
    let bonusOptimisation = 0;
    let bonusEspritCritique = 0;
    let bonusEsquive = 0;
    let bonusArmureLegere = 0;
    let bonusArmureLourde = 0;
    let bonusBouclier = 0;
    let bonusMusculation = 0;

    for (let item of this.items) {
      if (item.type === "capacite") {
        const val = item.system.valeur || 0;
        const nom = item.name.toLowerCase();
        
        if (nom.includes("endurance")) bonusEndurance += val;
        if (nom.includes("concentration")) bonusConcentration += val;
        if (nom.includes("mysticisme")) bonusMysticisme += val;
        if (nom.includes("optimisation")) bonusOptimisation += val;
        if (nom.includes("esprit critique")) bonusEspritCritique += val;
        if (nom.includes("esquive")) bonusEsquive += val;
        if (nom.includes("armure légère") || nom.includes("armure legere")) bonusArmureLegere += val;
        if (nom.includes("armure lourde")) bonusArmureLourde += val;
        if (nom.includes("bouclier")) bonusBouclier += val;
        if (nom.includes("musculation")) bonusMusculation += val;
      }
    }

    // --- 2. CALCUL DES CARACTÉRISTIQUES SECONDAIRES ---
    
    // PV = (Robustesse + Vigueur) * 2 + Endurance
    sec.pv.max = (robustesse + vigueur) * 2 + bonusEndurance;

    // PM = (Caractère + Discernement) * 2 + Concentration + (Mysticisme * 2)
    sec.pm.max = (caractere + discernement) * 2 + bonusConcentration + (bonusMysticisme * 2);

    // Seuil de Blessure = (Robustesse * 2) + Endurance
    sec.sb.value = (robustesse * 2) + bonusEndurance;

    // Résistance Magique = (Discernement + Maîtrise) * 2 + Concentration
    sec.resMag.value = (discernement + maitrise) * 2 + bonusConcentration;

    // Résistance Mentale = (Caractère + Prestance) * 2 + Esprit Critique
    sec.resMent.value = (caractere + prestance) * 2 + bonusEspritCritique;

    // Résistance Physique = (Robustesse * 3) + Esquive + Armures (si équipées)
    let resPhysBase = (robustesse * 3) + bonusEsquive;
    if (eq.armureLegere) resPhysBase += bonusArmureLegere;
    if (eq.armureLourde) resPhysBase += bonusArmureLourde;
    if (eq.bouclier) resPhysBase += bonusBouclier;
    sec.resPhys.value = resPhysBase;

    // Bagage = Base de 9 + Optimisation (Plafonné à 18 maximum)
    sec.bagage.max = Math.min(18, 9 + bonusOptimisation);

    // Reste des statistiques (inchangées)
    sec.rdc.max = fortune + vigueur;
    sec.rapidite.value = maitrise + vigueur;
    sec.poids.value = sec.resPhys.value * 10;

    // --- 3. STOCKAGE DES BONUS DE MUSCULATION POUR PLUS TARD ---
    // Ces valeurs ne s'affichent pas directement, mais seront très utiles pour les macros d'armes !
    sec.bonusDegatsCaC = bonusMusculation;
    sec.bonusChargeEffort = Math.ceil(bonusMusculation / 2);
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
