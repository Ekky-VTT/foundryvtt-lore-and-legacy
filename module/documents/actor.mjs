/**
 * Classe personnalisée pour les Acteurs de Lore & Legacy
 * @extends {Actor}
 */
export class LoreAndLegacyActor extends Actor {

  /** @override */
  prepareData() {
    // Exécute d'abord les préparations de base de Foundry
    super.prepareData();
  }

  /**
   * Méthode appelée automatiquement par Foundry pour calculer les données dérivées
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    const systemData = this.system;

    // On ne calcule les statistiques dérivées que pour le type "personnage" (ou pnj)
    if (this.type === "personnage" || this.type === "pnj") {
      this._preparePersonnageData(systemData);
    }
  }

  /**
   * Calculs spécifiques aux formules de Lore & Legacy
   * @param {Object} systemData - Les données système de l'acteur
   * @private
   */
  _preparePersonnageData(systemData) {
    const attr = systemData.attributs;
    const sec = systemData.secondaires;

    // Raccourcis pour lire facilement les valeurs d'attributs
    const caractere = attr.caractere.value || 0;
    const discernement = attr.discernement.value || 0;
    const maitrise = attr.maitrise.value || 0;
    const prestance = attr.prestance.value || 0;
    const robustesse = attr.robustesse.value || 0;
    const vigueur = attr.vigueur.value || 0;
    const fortune = attr.fortune.value || 0;

    // --- CALCUL DES CARACTÉRISTIQUES SECONDAIRES ---

    // Points de Vie (PV) = (Robustesse + Vigueur) * 2
    sec.pv.max = (robustesse + vigueur) * 2;

    // Points de Magie (PM) = (Caractère + Discernement) * 2
    sec.pm.max = (caractere + discernement) * 2;

    // Résistance Physique (Res. Phys.) = Robustesse * 3
    sec.resPhys.value = robustesse * 3;

    // Résistance Magique (Res. Mag.) = (Discernement + Maîtrise) * 2
    sec.resMag.value = (discernement + maitrise) * 2;

    // Résistance Mentale (Res. Ment.) = (Caractère + Prestance) * 2
    sec.resMent.value = (caractere + prestance) * 2;

    // Réserve de la Dernière Chance (RDC) = Fortune + Vigueur
    sec.rdc.max = fortune + vigueur;

    // Seuil de Blessure (SB) = Robustesse * 2
    sec.sb.value = robustesse * 2;

    // Rapidité = Maîtrise + Vigueur
    sec.rapidite.value = maitrise + vigueur;

    // Poids = Résistance Physique * 10
    sec.poids.value = sec.resPhys.value * 10;

    // Bagage : Valeur de base à 9 (Maximum absolu fixé à 18)
    sec.bagage.max = 18;
  }
}
