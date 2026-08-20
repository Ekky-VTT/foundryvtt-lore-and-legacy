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
    attr.caractere.total = Number(attr.caractere.value || 0) + Number(bonusPeuple.caractere);
    attr.discernement.total = Number(attr.discernement.value || 0) + Number(bonusPeuple.discernement);
    attr.maitrise.total = Number(attr.maitrise.value || 0) + Number(bonusPeuple.maitrise);
    attr.prestance.total = Number(attr.prestance.value || 0) + Number(bonusPeuple.prestance);
    attr.robustesse.total = Number(attr.robustesse.value || 0) + Number(bonusPeuple.robustesse);
    attr.vigueur.total = Number(attr.vigueur.value || 0) + Number(bonusPeuple.vigueur);
    attr.fortune.total = Number(attr.fortune.max || 0) + Number(bonusPeuple.fortune);

    // Récupération pour les caractéristiques secondaires
    const caractere = attr.caractere.total || 0;
    const discernement = attr.discernement.total || 0;
    const maitrise = attr.maitrise.total || 0;
    const prestance = attr.prestance.total || 0;
    const robustesse = attr.robustesse.total || 0;
    const vigueur = attr.vigueur.total || 0;
    const fortune = attr.fortune.total || 0;

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
    // Initialisation globale des flags
    this.flags = {};
    let baseSaut = Math.floor((maitrise + vigueur) / 3);
    
    // Nouveaux compteurs pour les Traits
    let bonusBagageTraits = 0;
    let bonusResPhysTraits = 0;
    let bonusResMagTraits = 0;
    let bonusResMentTraits = 0;
    let bonusPVTraits = 0;
    let bonusPMTraits = 0;
    let bonusRapiditeTraits = 0;
    let bonusPoidsTraits = 0;
    let multRDC = 1;

    for (let key in attr) {
      attr[key].traitFortune = false;
      attr[key].traitAdversite = false;
    }
    
    for (let item of this.items) {
      if (item.type === "trait") {
        const nom = item.name.toLowerCase();
        const estSoigne = item.system.soigne;

        // Attributs : Fortune
        if (nom.includes("baraqué")) attr.vigueur.traitFortune = true;
        if (nom.includes("irréductible")) attr.caractere.traitFortune = true;
        if (nom.includes("petit génie")) attr.discernement.traitFortune = true;
        if (nom.includes("solide comme un roc")) attr.robustesse.traitFortune = true;
        if (nom.includes("vif comme l'éclair")) attr.maitrise.traitFortune = true;
        if (nom.includes("lunaire") && !estSoigne) attr.discernement.traitFortune = true;

        // Attributs : Adversité (seulement si non soigné)
        if (nom.includes("candide") && !estSoigne) attr.caractere.traitAdversite = true;
        if (nom.includes("frêle") && !estSoigne) attr.robustesse.traitAdversite = true;
        if (nom.includes("ingénu") && !estSoigne) attr.discernement.traitAdversite = true;
        if (nom.includes("maladroit") && !estSoigne) attr.maitrise.traitAdversite = true;
        if (nom.includes("moche") && !estSoigne) attr.prestance.traitAdversite = true;
        if (nom.includes("rat de bibliothèque") && !estSoigne) attr.vigueur.traitAdversite = true;
        if (nom.includes("lunaire") && !estSoigne) attr.prestance.traitAdversite = true;

        // Capacités : Flags spécifiques
        if (nom.includes("athlétique")) {
          baseSaut *= 2;
          this.flags.fortuneAcrobatie = true;
          this.flags.fortuneEscalade = true;
        }
        if (nom.includes("animiste")) {
          this.flags.fortuneSorcellerie = true;
          this.flags.fortuneSpiritisme = true;
        }
        if (nom.includes("guérisseur")) this.flags.fortuneMedecine = true;
        if (nom.includes("technophile")) {
          this.flags.fortuneArcanotech = true;
          this.flags.fortuneMecanique = true;
        }
        if (nom.includes("techno-sceptique") && !estSoigne) {
          this.flags.adversiteArcanotech = true;
          this.flags.adversiteMecanique = true;
        }

        // Caractéristiques Secondaires
        if (nom.includes("bête de somme")) bonusBagageTraits += 3;
        if (nom.includes("blindé")) bonusResPhysTraits += 3; // Gardé au cas où
        if (nom.includes("cuir solide")) bonusResPhysTraits += 2;
        if (nom.includes("enveloppé")) bonusPoidsTraits += 20;
        if (nom.includes("hardi")) bonusPVTraits += 2;
        if (nom.includes("increvable")) multRDC = 2;
        if (nom.includes("opiniâtre")) bonusResMentTraits += 2;
        if (nom.includes("source de magie")) bonusPMTraits += 4;
        if (nom.includes("tatouages protecteurs")) bonusResMagTraits += 2;
        if (nom.includes("véloce")) bonusRapiditeTraits += 2;
        if (nom.includes("zazou")) {
          bonusResMentTraits += 4;
          this.flags.adversiteSociale = true;
        }

        // Flags pour équipement futur et macros
        if (nom.includes("main lourde")) this.flags.mainLourde = true;
        if (nom.includes("poings d'acier")) this.flags.poingsAcier = true;
        if (nom.includes("tireur d'élite")) this.flags.tireurElite = true;
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
    
    // PV = (Robustesse + Vigueur) * 2 + Endurance + Traits
    sec.pv.max = (robustesse + vigueur) * 2 + bonusEndurance + bonusPVTraits;

    // PM = (Caractère + Discernement) * 2 + Concentration + (Mysticisme * 2) + Traits
    sec.pm.max = (caractere + discernement) * 2 + bonusConcentration + (bonusMysticisme * 2) + bonusPMTraits;

    // Seuil de Blessure = (Robustesse * 2) + Endurance
    sec.sb.value = (robustesse * 2) + bonusEndurance;

    // Résistance Magique = (Discernement + Maîtrise) * 2 + Concentration + Traits
    sec.resMag.value = (discernement + maitrise) * 2 + bonusConcentration + bonusResMagTraits;

    // Résistance Mentale = (Caractère + Prestance) * 2 + Esprit Critique + Traits
    sec.resMent.value = (caractere + prestance) * 2 + bonusEspritCritique + bonusResMentTraits;

    // Résistance Physique = (Robustesse * 3) + Esquive + Armures + Traits
    let resPhysBase = (robustesse * 3) + bonusEsquive + bonusResPhysTraits;
    if (eq?.armureLegere) resPhysBase += bonusArmureLegere;
    if (eq?.armureLourde) resPhysBase += bonusArmureLourde;
    if (eq?.bouclier) resPhysBase += bonusBouclier;
    sec.resPhys.value = resPhysBase;

    // Bagage = Base de 9 + Optimisation + Traits - Plafonné à 18
    sec.bagage = sec.bagage || {};
    sec.bagage.max = Math.min(18, 9 + bonusOptimisation + bonusBagageTraits);
    sec.bagage.value = this.items.reduce((total, item) => {
      if (!item.system?.equipe) return total;
      const encombrement = Number(item.system.encombrement || 0);
      const quantite = Number(item.system.quantite || 1);
      return total + (encombrement * quantite);
    }, 0);

    // Reste des statistiques
    sec.rdc.max = (fortune + vigueur) * multRDC;
    sec.rapidite.value = maitrise + vigueur + bonusRapiditeTraits;
    sec.poids.value = (sec.resPhys.value * 10) + bonusPoidsTraits;

    // --- 3. STOCKAGE DES BONUS DE MUSCULATION POUR PLUS TARD ---
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
    
    const attributParent = attributLieKey ? this.system.attributs[attributLieKey] : null;
    const attributValue = attributParent ? attributParent.total : 0;
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    // --- HÉRITAGE DYNAMIQUE FORTUNE / ADVERSITÉ ---
    let isFortune = capacite.system.fortune || (attributParent && attributParent.finalFortune);
    let isAdversite = capacite.system.adversite || (attributParent && attributParent.finalAdversite);
    
    const nomCapa = capacite.name.toLowerCase();

    // VÉRIFICATION DES BONUS DE TRAITS SUR LES CAPACITÉS
    if (nomCapa.includes("acrobatie") && this.flags?.fortuneAcrobatie) isFortune = true;
    if (nomCapa.includes("escalade") && this.flags?.fortuneEscalade) isFortune = true;
    if (nomCapa.includes("sorcellerie") && this.flags?.fortuneSorcellerie) isFortune = true;
    if (nomCapa.includes("spiritisme") && this.flags?.fortuneSpiritisme) isFortune = true;
    if (nomCapa.includes("médecine") && this.flags?.fortuneMedecine) isFortune = true;
    if (nomCapa.includes("arcanotech") && this.flags?.fortuneArcanotech) isFortune = true;
    if (nomCapa.includes("mécanique") && this.flags?.fortuneMecanique) isFortune = true;
    
    // VÉRIFICATION DES MALUS DE TRAITS SUR LES CAPACITÉS
    if (nomCapa.includes("arcanotech") && this.flags?.adversiteArcanotech) isAdversite = true;
    if (nomCapa.includes("mécanique") && this.flags?.adversiteMecanique) isAdversite = true;

    // Cas spécifique du Zazou (Adversité sur toutes les interactions sociales)
    const socialCapacites = ["charme", "intimidation", "provocation", "marchandage", "présence apaisante", "rhétorique", "représentation"];
    if (this.flags?.adversiteSociale && socialCapacites.some(c => nomCapa.includes(c))) {
      isAdversite = true;
    }
    
    let formula = "";
    let flavorText = "";
    let typeDeDe = "d6";

    if (capaciteValue > 0) {
      typeDeDe = "d10";
      formula = `1d10 + ${capaciteValue}`;
      flavorText = `Jet de Capacité : <b>${capacite.name}</b>`;
    } else {
      typeDeDe = "d6";
      formula = `1d6 + ${attributValue}`;
      flavorText = `Jet de repli (sans <b>${capacite.name}</b>) : Attribut <b>${attributNom}</b>`;
    }

    if (isFortune) {
      formula += ` + 1${typeDeDe}[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    if (isAdversite) {
      formula += ` - 1${typeDeDe}[adversite]`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>`;
    }

    let roll = new Roll(formula);

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
    if (!this.system.attributs[attrKey]) return;

    const attribut = this.system.attributs[attrKey];
    const attrScore = attribut.total || 0;
    
    const nomsFormates = {
      caractere: "Caractère", discernement: "Discernement", maitrise: "Maîtrise",
      prestance: "Prestance", robustesse: "Robustesse", vigueur: "Vigueur", fortune: "Fortune"
    };
    const nomAffiche = nomsFormates[attrKey] || attrKey;

    let formula = `1d6 + ${attrScore}`;
    let flavorText = `Jet d'Attribut : <b>${nomAffiche}</b>`;

    if (attribut.finalFortune) {
      formula += ` + 1d6[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    if (attribut.finalAdversite) {
      formula += ` - 1d6[adversite]`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>`;
    }
    
    let roll = new Roll(formula);

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
