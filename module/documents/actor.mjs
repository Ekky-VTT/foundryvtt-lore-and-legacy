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

    // --- 0.5. GESTION DU PEUPLE ET DES ATTRIBUTS ---
    let bonusPeuple = { caractere: 0, discernement: 0, maitrise: 0, prestance: 0, robustesse: 0, vigueur: 0, fortune: 0 };
    this.peupleNom = "Aucun";

    // On cherche le Peuple dans l'inventaire
    for (let item of this.items) {
      if (item.type === "peuple") {
        this.peupleNom = item.name;
        bonusPeuple.caractere = item.system.bonusCaractere || 0;
        bonusPeuple.discernement = item.system.bonusDiscernement || 0;
        bonusPeuple.maitrise = item.system.bonusMaitrise || 0;
        bonusPeuple.prestance = item.system.bonusPrestance || 0;
        bonusPeuple.robustesse = item.system.bonusRobustesse || 0;
        bonusPeuple.vigueur = item.system.bonusVigueur || 0;
        bonusPeuple.fortune = item.system.bonusFortune || 0;
      }
    }

    // Calcul du Score Total = Points Investis (value) + Base du Peuple
    attr.caractere.total = (attr.caractere.value || 0) + bonusPeuple.caractere;
    attr.discernement.total = (attr.discernement.value || 0) + bonusPeuple.discernement;
    attr.maitrise.total = (attr.maitrise.value || 0) + bonusPeuple.maitrise;
    attr.prestance.total = (attr.prestance.value || 0) + bonusPeuple.prestance;
    attr.robustesse.total = (attr.robustesse.value || 0) + bonusPeuple.robustesse;
    attr.vigueur.total = (attr.vigueur.value || 0) + bonusPeuple.vigueur;
    
    // Pour la Fortune, la valeur investie est dans 'max' (la ressource de base est 'value')
    attr.fortune.maxTotal = (attr.fortune.max || 0) + bonusPeuple.fortune;

    // ATTENTION : Tu dois maintenant utiliser 'attr.X.total' pour tes caractéristiques secondaires !
    // Exemple : const caractere = attr.caractere.total;
    // (Pense à corriger la récupération de tes 7 attributs juste en dessous dans ton fichier)

    const caractere = attr.caractere.total || 0;
    const discernement = attr.discernement.total || 0;
    const maitrise = attr.maitrise.total || 0;
    const prestance = attr.prestance.total || 0;
    const robustesse = attr.robustesse.total || 0;
    const vigueur = attr.vigueur.total || 0;
    const fortune = attr.fortune.maxTotal || 0;

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
    // --- 1.5 SCAN DES TRAITS ---
    this.flags = { fortuneAcrobatie: false, fortuneEscalade: false };
    let baseSaut = Math.floor((maitrise + vigueur) / 3);
    let bonusBagageTraits = 0;
    let bonusResPhysTraits = 0;

    // NOUVEAU : Initialiser les marqueurs de Traits pour les Attributs
    for (let key in attr) {
      attr[key].traitFortune = false;
      attr[key].traitAdversite = false;
    }
    
    for (let item of this.items) {
      if (item.type === "trait") {
        const nom = item.name.toLowerCase();
        const estSoigne = item.system.soigne;

        // Baraqué (Dé de Fortune sur Vigueur)
        if (nom.includes("baraqué")) {
          attr.vigueur.fortune = true;
        }

        // Athlétique (Double saut, Fortune Acrobatie/Escalade)
        if (nom.includes("athlétique")) {
          baseSaut *= 2;
          this.flags.fortuneAcrobatie = true;
          this.flags.fortuneEscalade = true;
        }
        // Candide (Adversité sur Caractère, SAUF SI soigné)
        if (nom.includes("candide") && !estSoigne) {
          attr.caractere.adversite = true;
        }
        // Bête de Somme : +3 Bagage
        if (nom.includes("bête de somme")) {
          bonusBagageTraits += 3;
        }
        // Blindé : +3 Résistance Physique
        if (nom.includes("blindé")) {
          bonusResPhysTraits += 3;
        }
      }
    }
    
    // Calculer l'état final des Attributs (Base de données OU Trait)
    for (let key in attr) {
      attr[key].finalFortune = attr[key].fortune || attr[key].traitFortune;
      attr[key].finalAdversite = attr[key].adversite || attr[key].traitAdversite;
    }
    
    // On sauvegarde la distance de saut finale pour l'affichage
    sec.distanceSaut = baseSaut;
    
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

    // Bagage = Base de 9 + Optimisation + Traits (ex: Bête de Somme) - Plafonné à 18 maximum
    sec.bagage.max = Math.min(18, 9 + bonusOptimisation + bonusBagageTraits);

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
    
    // Récupération de l'attribut complet parent
    const attributParent = attributLieKey ? this.system.attributs[attributLieKey] : null;
    const attributValue = attributParent ? attributParent.total : 0;
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    // --- HÉRITAGE DYNAMIQUE FORTUNE / ADVERSITÉ ---
    let isFortune = capacite.system.fortune || (attributParent && attributParent.finalFortune);
    let isAdversite = capacite.system.adversite || (attributParent && attributParent.finalAdversite);
    
    // --- ajout de la gestion des Traits qui impactent les capacités 
    const nomCapa = capacite.name.toLowerCase();

    // VÉRIFICATION DES BONUS DE TRAITS (Ex: Athlétique)
    if (nomCapa.includes("acrobatie") && this.flags?.fortuneAcrobatie) isFortune = true;
    if (nomCapa.includes("escalade") && this.flags?.fortuneEscalade) isFortune = true;
    
    let formula = "";
    let flavorText = "";
    let typeDeDe = "d6";

    // 1. Déterminer le dé de base et le type de dé pour la Fortune/Adversité
    if (capaciteValue > 0) {
      typeDeDe = "d10";
      formula = `1d10 + ${capaciteValue}`;
      flavorText = `Jet de Capacité : <b>${capacite.name}</b>`;
    } else {
      typeDeDe = "d6";
      formula = `1d6 + ${attributValue}`;
      flavorText = `Jet de repli (sans <b>${capacite.name}</b>) : Attribut <b>${attributNom}</b>`;
    }

    // 2. Gestion du Dé de Fortune
    if (isFortune) {
      formula += ` + 1${typeDeDe}[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    // 3. Gestion du Dé d'Adversité
    if (isAdversite) {
      formula += ` - 1${typeDeDe}[adversite]`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>`;
    }

    // 4. Lancement du jet
    let roll = new Roll(formula);

    // --- APPLICATION DES COULEURS DICE SO NICE! ---
    for (let term of roll.terms) {
      if (term.flavor === "fortune") {
        if (!term.options) term.options = {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        if (!term.options) term.options = {};
        term.options.colorset = "adversite";
      }
    }

    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavorText
    });
  }

  /**
   * Effectue un jet d'Attribut pur (1D6) avec prise en compte de Fortune/Adversité
   * @param {string} attrKey - La clé de l'attribut (ex: "caractere")
   */
  async rollAttribut(attrKey) {
    // Vérification de sécurité
    if (!this.system.attributs[attrKey]) return;

    const attribut = this.system.attributs[attrKey];
    const attrScore = (attrKey === "fortune") ? (attribut.max || 0) : (attribut.total || 0);
    
    // Formatage du nom pour un bel affichage (ex: "caractere" -> "Caractère")
    const nomsFormates = {
      caractere: "Caractère", discernement: "Discernement", maitrise: "Maîtrise",
      prestance: "Prestance", robustesse: "Robustesse", vigueur: "Vigueur", fortune: "Fortune"
    };
    const nomAffiche = nomsFormates[attrKey] || attrKey;

    let formula = `1d6 + ${attrScore}`;
    let flavorText = `Jet d'Attribut : <b>${nomAffiche}</b>`;

    // Gestion du Dé de Fortune lié à l'Attribut
    if (attribut.finalFortune) {
      formula += ` + 1d6[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    // Gestion du Dé d'Adversité lié à l'Attribut
    if (attribut.finalAdversite) {
      formula += ` - 1d6[adversite]`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>`;
    }
    
    // Lancement du jet
    let roll = new Roll(formula);

    // Application des couleurs Dice So Nice!
    for (let term of roll.terms) {
      if (term.flavor === "fortune") {
        if (!term.options) term.options = {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        if (!term.options) term.options = {};
        term.options.colorset = "adversite";
      }
    }

    await roll.evaluate();

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavorText
    });
  }
}
