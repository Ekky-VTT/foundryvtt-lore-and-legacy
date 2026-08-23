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
    if (this.type === "personnage") {
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

    // --- NOUVEAU : CALCUL DES PROTECTIONS ÉQUIPÉES ET RÉSISTANCE PHYSIQUE ---
    let bonusResPhysArmures = 0;
    let hasArmureLegere = false;
    let hasArmureLourde = false;
    let hasBouclier = false;

    for (let item of this.items) {
      if (item.type === "armure" && item.system?.equipe) {
        bonusResPhysArmures += Number(item.system.bonusResPhys || 0);
        if (item.system.type === "legere") hasArmureLegere = true;
        if (item.system.type === "lourde") hasArmureLourde = true;
        if (item.system.type === "bouclier") hasBouclier = true;
      }
    }

    // Mise à jour automatique des flags d'équipement
    if (eq) {
      eq.armureLegere = hasArmureLegere;
      eq.armureLourde = hasArmureLourde;
      eq.bouclier = hasBouclier;
    }

    // Résistance Physique = (Robustesse * 3) + Esquive + Bonus Armures (équipement) + Bonus Traits
    let resPhysBase = (robustesse * 3) + bonusEsquive + bonusResPhysTraits + bonusResPhysArmures;
    
    // Application des bonus de capacités passives si le bon type est équipé
    if (hasArmureLegere) resPhysBase += bonusArmureLegere;
    if (hasArmureLourde) resPhysBase += bonusArmureLourde;
    if (hasBouclier) resPhysBase += bonusBouclier;

    sec.resPhys.value = resPhysBase;

    // --- CALCUL DU BAGAGE ---
    // Bagage = Base de 9 + Optimisation + Traits - Plafonné à 18
    sec.bagage = sec.bagage || {};
    sec.bagage.max = Math.min(18, 9 + bonusOptimisation + bonusBagageTraits);
    
    // Calcul du bagage actuel : on somme l'encombrement de tous les objets
    sec.bagage.value = this.items.reduce((total, item) => {
      // On ne compte que les objets qui possèdent un champ "encombrement"
      if (item.system && item.system.encombrement !== undefined) {
        const encombrement = Number(item.system.encombrement || 0);
        const quantite = Number(item.system.quantite || 1);
        return total + (encombrement * quantite);
      }
      return total;
    }, 0);

    // Nouveau : on crée un indicateur booléen (vrai/faux) si le bagage dépasse le max
    sec.bagage.surcharge = sec.bagage.value > sec.bagage.max;

    // Reste des statistiques
    sec.rdc.max = (fortune + vigueur) * multRDC;
    sec.rapidite.value = maitrise + vigueur + bonusRapiditeTraits;
    sec.sprint.value = sec.rapidite.value * 2;
    sec.poids.value = (sec.resPhys.value * 10) + bonusPoidsTraits;

    // --- 3. STOCKAGE DES BONUS DE MUSCULATION POUR PLUS TARD ---
    sec.bonusDegatsCaC = bonusMusculation;
    sec.bonusChargeEffort = Math.ceil(bonusMusculation / 2);
  }

  /**
   * Effectue un jet de Capacité (ou d'Attribut en repli) avec Fortune/Adversité
   * @param {string} itemId - L'ID de l'objet Capacité cliqué
   */
  async rollCapacite(itemId, options = {}) {
    const capacite = this.items.get(itemId);
    if (!capacite || capacite.type !== "capacite") return;

    const capaciteValue = capacite.system.valeur;
    const attributLieKey = capacite.system.attributLie; 
    
    const attributParent = attributLieKey ? this.system.attributs[attributLieKey] : null;
    const attributValue = attributParent ? attributParent.total : 0;
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    // --- HÉRITAGE DYNAMIQUE FORTUNE / ADVERSITÉ ---
    let isFortune = options.fortune !== undefined
      ? options.fortune
      : capacite.system.fortune || (attributParent && attributParent.finalFortune);
    let isAdversite = options.adversite !== undefined
      ? options.adversite
      : capacite.system.adversite || (attributParent && attributParent.finalAdversite);
    
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

    if (options.fortune !== undefined) isFortune = options.fortune;
    if (options.adversite !== undefined) isAdversite = options.adversite;
    
    let formula = "";
    let flavorText = "";
    let typeDeDe = "d6";

    if (capaciteValue > 0) {
      typeDeDe = "d10";
      formula = `1d10 + ${capaciteValue}`;
      flavorText = options.sortilegeName
        ? `Jet de Sortilège : <b>${options.sortilegeName}</b> (Sorcellerie)`
        : `Jet de Capacité : <b>${capacite.name}</b>`;
    } else {
      typeDeDe = "d6";
      formula = `1d6 + ${attributValue}`;
      flavorText = options.sortilegeName
        ? `Jet de Sortilège : <b>${options.sortilegeName}</b> (repli sans Sorcellerie) : Attribut <b>${attributNom}</b>`
        : `Jet de repli (sans <b>${capacite.name}</b>) : Attribut <b>${attributNom}</b>`;
    }

    if (isFortune) {
      formula += ` + 1${typeDeDe}[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    if (isAdversite) {
      formula = `1${typeDeDe} + max(0, ${capaciteValue > 0 ? capaciteValue : attributValue} - 1${typeDeDe}[adversite])${isFortune ? ` + 1${typeDeDe}[fortune]` : ""}`;
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
  async rollAttribut(attrKey, options = {}) {
    if (!this.system.attributs[attrKey]) return;

    const attribut = this.system.attributs[attrKey];
    const attrScore = attribut.total || attribut.value || 0;
    
    const nomsFormates = {
      caractere: "Caractère", discernement: "Discernement", maitrise: "Maîtrise",
      prestance: "Prestance", robustesse: "Robustesse", vigueur: "Vigueur", fortune: "Fortune"
    };
    const nomAffiche = nomsFormates[attrKey] || attrKey;

    let formula = `1d6 + ${attrScore}`;
    let flavorText = options.sortilegeName
      ? `Jet de Sortilège : <b>${options.sortilegeName}</b> (repli : Discernement)`
      : `Jet d'Attribut : <b>${nomAffiche}</b>`;

    const isFortune = options.fortune !== undefined ? options.fortune : attribut.finalFortune;
    const isAdversite = options.adversite !== undefined ? options.adversite : attribut.finalAdversite;

    if (isFortune) {
      formula += ` + 1d6[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>`;
    }

    if (isAdversite) {
      formula = `1d6 + max(0, ${attrScore} - 1d6[adversite])${isFortune ? " + 1d6[fortune]" : ""}`;
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

  async rollArme(itemId) {
    const arme = this.items.get(itemId);
    if (!arme || !arme.system.equipe) return;

    const isArcanotech = arme.type === "arcanotech";
    const skillName = isArcanotech
      ? "arcanotech"
      : arme.system.typeArme === "distance" ? "combat à distance" : "combat rapproché";
    const competence = this.items.find(item =>
      item.type === "capacite" && item.name.toLowerCase().includes(skillName)
    );
    const attributKey = competence?.system.attributLie || (isArcanotech ? "discernement" : "maitrise");
    const attribut = this.system.attributs[attributKey] || this.system.attributs.maitrise;
    const score = competence ? Number(competence.system.valeur || 0) : 0;
    const usesAttribute = !competence || score <= 0;
    const baseScore = usesAttribute ? Number(attribut.total || attribut.value || 0) : score;
    const die = usesAttribute ? "d6" : "d10";
    let isFortune = competence
      ? competence.system.fortune || attribut.finalFortune
      : attribut.finalFortune;
    let isAdversite = competence
      ? competence.system.adversite || attribut.finalAdversite
      : attribut.finalAdversite;

    if (isArcanotech && this.flags?.fortuneArcanotech) isFortune = true;
    if (isArcanotech && this.flags?.adversiteArcanotech) isAdversite = true;

    let formula = `1${die} + ${baseScore}`;
    if (isFortune) formula += ` + 1${die}[fortune]`;
    if (isAdversite) formula = `1${die} + max(0, ${baseScore} - 1${die}[adversite])${isFortune ? ` + 1${die}[fortune]` : ""}`;

    const roll = new Roll(formula);
    for (const term of roll.terms) {
      if (term.flavor === "fortune") {
        term.options ??= {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        term.options ??= {};
        term.options.colorset = "adversite";
      }
    }

    await roll.evaluate();

    const targets = [...(game.user.targets || [])];
    const resistanceKey = isArcanotech ? "resMag" : "resPhys";
    const targetResults = targets.map(token => {
      const targetActor = token.actor;
      const resistance = Number(targetActor?.system?.secondaires?.[resistanceKey]?.value || 0);
      const result = this._getDegreeOfSuccess(roll, resistance, die);
      const targetLabel = targetActor?.name || token.name;
      const damageButton = result.damageMultiplier > 0
        ? `<button type="button" class="lnl-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${arme.id}" data-target-name="${encodeURIComponent(targetLabel)}" data-degree="${result.degree}" data-multiplier="${result.damageMultiplier}"><i class="fas fa-dice-d8"></i> Lancer les dégâts</button>`
        : "";
      return `<p><b>${targetLabel}</b> → <span style="color:${result.success ? "#2b7a4b" : "#b32424"}; font-weight:bold;">${result.degreeLabel}</span>${damageButton}</p>`;
    }).join("");


    const targetFlavor = targetResults || `
      <p style="text-align: center; margin-bottom: 5px; color: #555; font-style: italic;">Aucune cible sélectionnée.</p>
      <button type="button" class="lnl-manual-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${arme.id}">
        <i class="fas fa-bullseye"></i> Lancer les dégâts (Manuel)
      </button>
    `;
    const skillLabel = competence
      ? competence.name
      : `Attribut : ${attributKey === "discernement" ? "Discernement" : "Maîtrise"} (sans ${skillName})`;
    const weaponLabel = isArcanotech ? `${arme.name} (Arcanotech)` : arme.name;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `Jet d'attaque : <b>${weaponLabel}</b><br>${skillLabel}<br>${targetFlavor}`
    });
  }

  /**
   * Ouvre une boîte de dialogue pour choisir le degré de réussite manuel
   * @param {string} itemId - L'ID de l'arme utilisée
   */
  async promptManualDamage(itemId) {
    const arme = this.items.get(itemId);
    if (!arme) return;

    const dialogContent = `
      <div style="text-align: center; margin-bottom: 10px;">
        <p>L'attaque avec <b>${arme.name}</b> a touché !</p>
        <p style="font-size: 12px; color: #555;">Choisissez le degré de réussite obtenu :</p>
      </div>
    `;

    new Dialog({
      title: "⚔️ Jet de dégâts manuel",
      content: dialogContent,
      buttons: {
        partial: {
          label: "Partielle (x0.5)",
          callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite partielle", 0.5)
        },
        standard: {
          label: "Standard (x1)",
          callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite standard", 1)
        },
        major: {
          label: "Majeure (x1.5)",
          callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite majeure", 1.5)
        },
        spectacular: {
          label: "Spectaculaire (x2)",
          callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite spectaculaire", 2)
        }
      },
      default: "standard"
    }, { width: 500 }).render(true);
  }

  _getDegreeOfSuccess(roll, difficulty, die) {
    const total = Number(roll.total || 0);
    const halfDifficulty = Math.ceil(difficulty / 2);
    const majorDifficulty = Math.ceil(difficulty * 1.5);
    
    // Le dé de fortune doit faire son résultat MAX
    const fortuneMax = roll.dice.some(term =>
      term.flavor === "fortune" && Number(term.total) === term.faces
    );
    
    // Le dé d'adversité doit faire son résultat MAX !
    const adversityMax = roll.dice.some(term =>
      term.flavor === "adversite" && Number(term.total) === term.faces
    );

    let degree;
    if (total < halfDifficulty) degree = "failure";
    else if (total < difficulty) degree = "partial";
    else if (total >= majorDifficulty) degree = "major";
    else degree = "standard";

    // Gestion du Coup du Sort : Si Fortune MAX et Adversité MAX tombent en même temps
    let isCoupDuSort = false;
    if (fortuneMax && adversityMax) {
      isCoupDuSort = true;
    } else {
      // Sinon, gestion normale des réussites spectaculaires et échecs désastreux
      if (["standard", "major"].includes(degree) && fortuneMax) degree = "spectacular";
      else if (["failure", "partial"].includes(degree) && adversityMax) degree = "disastrous";
    }

    const labels = {
      failure: "Échec",
      partial: "Réussite partielle (effet / 2)",
      standard: "Réussite standard",
      major: "Réussite majeure (effet x 1,5)",
      spectacular: "Réussite spectaculaire (effet x 2)",
      disastrous: "!! ÉCHEC DÉSASTREUX !!"
    };

    // On ajoute visuellement le Coup du Sort au label si ça s'est produit
    let finalLabel = labels[degree];
    if (isCoupDuSort) {
       finalLabel += ` <br><span style="color:#d97711; font-weight:bold; font-size:14px; text-transform:uppercase;">⚡ Coup du Sort ⚡</span>`;
    }

    const multipliers = {
      failure: 0,
      partial: 0.5,
      standard: 1,
      major: 1.5,
      spectacular: 2,
      disastrous: 0
    };

    return {
      degree,
      degreeLabel: finalLabel,
      damageMultiplier: multipliers[degree],
      success: !["failure", "disastrous"].includes(degree)
    };
  }

async rollArmeDegats(itemId, targetName, degree, multiplier) {
    const arme = this.items.get(itemId);
    if (!arme) return;

    const baseFormula = arme.system.degatsBase || "1d8";
    const bonus = Number(arme.system.degatsBonus || 0);
    
    // On extrait dynamiquement le type de dé (ex: "1d8" ou "1d10") pour l'utiliser dans les malus
    const dieMatch = baseFormula.toLowerCase().match(/d\d+/);
    const die = dieMatch ? `1${dieMatch[0]}` : "1d8";

    let formula = bonus ? `${baseFormula} + ${bonus}` : baseFormula;
    let flavorText = `Dégâts : <b>${arme.type === "arcanotech" ? `${arme.name} (Arcanotech)` : arme.name}</b> contre <b>${targetName}</b><br><span style="font-size:12px; font-style: italic; color: #555;">Degré : ${degree} (multiplicateur x${multiplier})</span>`;

    // --- NOUVEAUTÉ : GESTION DES DÉGÂTS ARCANOTECH ---
    if (arme.type === "arcanotech") {
      const isFortune = arme.system.fortune;
      const isAdversite = arme.system.adversite;

      if (isFortune) {
        formula += ` + ${die}[fortune]`;
        flavorText += `<br><span style="color:#2a7b36; font-size:11px; font-weight:bold;">[+ Fortune Arcanique]</span>`;
      }
      
      if (isAdversite) {
        // L'adversité réduit le bonus de dégâts, sans jamais tomber sous 0, tout en gardant le dé de base
        formula = `${baseFormula} + max(0, ${bonus} - ${die}[adversite])${isFortune ? ` + ${die}[fortune]` : ""}`;
        flavorText += `<br><span style="color:#b32424; font-size:11px; font-weight:bold;">[- Adversité (Mal identifié)]</span>`;
      }
    }

    // Évaluation du jet
    const roll = await new Roll(formula).evaluate();
    
    // Application des couleurs Dice So Nice! sur les jets de dégâts
    for (const term of roll.dice) {
      if (term.flavor === "fortune") {
        term.options ??= {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        term.options ??= {};
        term.options.colorset = "adversite";
      }
    }

    const adjustedTotal = Math.ceil(roll.total * Number(multiplier));
    const rollHtml = await roll.render();

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      flavor: flavorText,
      content: `
        ${rollHtml}
        <div style="margin-top: 8px; padding-top: 5px; border-top: 2px dashed #b32424; text-align: center; background: rgba(179,36,36,0.1); border-radius: 3px; padding-bottom: 5px;">
          <span style="font-size:12px; font-weight:bold; color:#0e3a47; text-transform: uppercase;">Dégâts Finaux Appliqués</span><br>
          <span style="font-size:28px; font-weight:bold; color:#b32424; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">${adjustedTotal}</span>
        </div>
      `
    });
  }

  async rollPNJArme(index, options = {}) {
    if (this.type !== "pnj") return;

    const arme = this.system.armesPNJ?.[index];
    if (!arme || !arme.nom) return;

    const cd = Number(arme.cd || 0);
    const isFortune = options.fortune === true;
    const isAdversite = options.adversite === true;
    let formula = `1d8 + ${cd}`;
    let flavorText = `Dégâts : <b>${arme.nom}</b> (1D8 + ${cd})`;

    if (isFortune) {
      formula += " + 1d8[fortune]";
      flavorText += ' <span style="color:#2a7b36; font-weight:bold;">[+ Fortune]</span>';
    }

    if (isAdversite) {
      formula = `1d8 + max(0, ${cd} - 1d8[adversite])${isFortune ? " + 1d8[fortune]" : ""}`;
      flavorText += ' <span style="color:#b32424; font-weight:bold;">[- Adversité]</span>';
    }

    const roll = new Roll(formula);
    for (const term of roll.terms) {
      if (term.flavor === "fortune") {
        term.options ??= {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        term.options ??= {};
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
   * Lance un Sortilège (Sorcellerie ou Discernement en repli)
   * avec gestion de la règle "Excéder ses Points de Magie"
   * @param {string} itemId - ID du sortilège
   */
  async rollSortilege(itemId) {
    const sortilege = this.items.get(itemId);
    if (!sortilege || sortilege.type !== "sortilege") return;

    // 1. Calcul du coût et vérification de la ressource vitale
    const coutPM = sortilege.system.typeMagie === "rituelle"
      ? Number(sortilege.system.coutTotal || sortilege.system.coutPM || 1)
      : Number(sortilege.system.coutPM || 1);

    const currentPM = Number(this.system.secondaires?.pm?.value || 0);
    const currentPV = Number(this.system.secondaires?.pv?.value || 0);
    const currentRDC = Number(this.system.secondaires?.rdc?.value || 0);

    let coutAffiche = `<b>${coutPM} PM</b>`;

    // GESTION DU DÉPASSEMENT DE POINTS DE MAGIE
    if (coutPM > currentPM) {
      const deficit = coutPM - currentPM;
      
      const proceed = await new Promise((resolve) => {
        new Dialog({
          title: "⚠️ Épuisement Magique",
          content: `
            <div style="text-align: center; margin-bottom: 10px;">
              <h3 style="color: #b32424; margin-bottom: 5px;">Dépassement de PM !</h3>
              <p>Ce sortilège requiert <b>${coutPM} PM</b>, mais il ne vous en reste que <b>${currentPM}</b>.</p>
              <p>Selon la règle d'<i>Excès de Points de Magie</i>, le déficit de <b>${deficit} points</b> sera prélevé sur votre force vitale (PV, puis RDC) !</p>
              <p style="margin-top: 10px;"><i>Êtes-vous sûr de vouloir sacrifier votre santé pour lancer ce sort ?</i></p>
            </div>
          `,
          buttons: {
            yes: {
              icon: '<i class="fas fa-skull"></i>',
              label: "Sacrifier ma santé",
              callback: () => resolve(true)
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: "Annuler le sort",
              callback: () => resolve(false)
            }
          },
          default: "no"
        }, { width: 450 }).render(true);
      });

      if (!proceed) return; // Le joueur a annulé, on stoppe tout !

      // Calcul des nouvelles valeurs vitales et des alertes de statut
      let newPV = currentPV;
      let newRDC = currentRDC;
      let avertissementSante = "";

      if (deficit <= currentPV) {
        newPV -= deficit;
        coutAffiche = `<b>${currentPM} PM</b> et <span style="color:#b32424; font-weight:bold;">${deficit} PV sacrifiés</span>`;
        if (newPV === 0) {
          avertissementSante = "<br><span style='color:#b32424;'>Le personnage tombe <b>HORS DE COMBAT</b> !</span>";
        }
      } else {
        const deficitRDC = deficit - currentPV;
        newPV = 0;
        newRDC = Math.max(0, currentRDC - deficitRDC);
        coutAffiche = `<b>${currentPM} PM</b>, <span style="color:#b32424; font-weight:bold;">${currentPV} PV</span> et <span style="color:#800000; font-weight:bold;">${deficitRDC} RDC sacrifiés</span>`;
        
        if (newRDC > 0) {
          avertissementSante = "<br><span style='color:#b32424;'>Le personnage tombe <b>INCONSCIENT</b> !</span>";
        } else {
          avertissementSante = "<br><span style='color:#800000; font-weight:bold; text-transform:uppercase;'>État Critique : Aux portes de la mort !</span>";
        }
      }

      await this.update({
        "system.secondaires.pm.value": 0,
        "system.secondaires.pv.value": newPV,
        "system.secondaires.rdc.value": newRDC
      });

      // Ajout de l'alerte à l'étiquette affichée dans le chat
      coutAffiche += avertissementSante;

    } else {
      // Le personnage a assez de PM, déduction normale
      await this.update({ "system.secondaires.pm.value": currentPM - coutPM });
    }

    // 2. Recherche de la capacité Sorcellerie ou repli sur Discernement
    const competence = this.items.find(item =>
      item.type === "capacite" && item.name.toLowerCase().includes("sorcellerie")
    );
    const attribut = this.system.attributs.discernement || { total: 0, finalFortune: false, finalAdversite: false };
    const score = competence ? Number(competence.system.valeur || 0) : 0;
    const usesAttribute = !competence || score <= 0;
    const baseScore = usesAttribute ? Number(attribut.total || attribut.value || 0) : score;
    const die = usesAttribute ? "d6" : "d10";

    // Gestion Fortune / Adversité
    let isFortune = competence
      ? competence.system.fortune || attribut.finalFortune
      : attribut.finalFortune;
    let isAdversite = competence
      ? competence.system.adversite || attribut.finalAdversite
      : attribut.finalAdversite;

    if (this.flags?.fortuneSorcellerie) isFortune = true;

    let formula = `1${die} + ${baseScore}`;
    if (isFortune) formula += ` + 1${die}[fortune]`;
    if (isAdversite) formula = `1${die} + max(0, ${baseScore} - 1${die}[adversite])${isFortune ? ` + 1${die}[fortune]` : ""}`;

    const roll = new Roll(formula);
    for (const term of roll.dice) {
      if (term.flavor === "fortune") {
        term.options ??= {};
        term.options.colorset = "fortune";
      } else if (term.flavor === "adversite") {
        term.options ??= {};
        term.options.colorset = "adversite";
      }
    }

    await roll.evaluate();

    // 3. Détermination des Cibles et des Degrés de réussite
    const isIllusoire = sortilege.system.typeMagie === "illusoire";
    const resistanceKey = isIllusoire ? "resMent" : "resMag";
    const isAttack = sortilege.system.sortAttaque === true;

    const targets = [...(game.user.targets || [])];
    let targetResults = "";

    if (targets.length > 0) {
      targetResults = targets.map(token => {
        const targetActor = token.actor;
        const resistance = Number(targetActor?.system?.secondaires?.[resistanceKey]?.value || 0);
        const result = this._getDegreeOfSuccess(roll, resistance, die);
        const targetLabel = targetActor?.name || token.name;

        let damageButton = "";
        if (isAttack && result.damageMultiplier > 0) {
          damageButton = `<button type="button" class="lnl-sort-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${sortilege.id}" data-target-name="${encodeURIComponent(targetLabel)}" data-degree="${result.degree}" data-multiplier="${result.damageMultiplier}"><i class="fas fa-wand-magic-sparkles"></i> Lancer les dégâts magiques</button>`;
        }

        return `<p><b>${targetLabel}</b> → <span style="color:${result.success ? "#2b7a4b" : "#b32424"}; font-weight:bold;">${result.degreeLabel}</span>${damageButton}</p>`;
      }).join("");
    } else {
      if (isAttack) {
        targetResults = `
          <p style="text-align: center; margin-bottom: 5px; color: #555; font-style: italic;">Aucune cible sélectionnée.</p>
          <button type="button" class="lnl-manual-sort-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${sortilege.id}">
            <i class="fas fa-bullseye"></i> Lancer les dégâts (Manuel)
          </button>
        `;
      } else {
        targetResults = `<p>Aucune cible sélectionnée : résultat du jet de Sorcellerie uniquement.</p>`;
      }
    }

    const skillLabel = competence
      ? `Capacité : <b>Sorcellerie</b>`
      : `Attribut : <b>Discernement</b> (sans Sorcellerie)`;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `Sortilège : <b>${sortilege.name}</b> (${sortilege.system.typeMagie})<br>${skillLabel} | Coût : ${coutAffiche}<br>${targetResults}`
    });
  }

  /**
   * Effectue le jet de dégâts magiques
   */
  async rollSortilegeDegats(itemId, targetName, degree, multiplier) {
    const sortilege = this.items.get(itemId);
    if (!sortilege) return;

    const baseFormula = sortilege.system.degatsBase || "1d8";
    const bonus = Number(sortilege.system.degatsBonus || 0);
    const formula = bonus ? `${baseFormula} + ${bonus}` : baseFormula;

    const roll = await new Roll(formula).evaluate();
    const adjustedTotal = Math.ceil(roll.total * Number(multiplier));
    const rollHtml = await roll.render();

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      flavor: `Dégâts magiques : <b>${sortilege.name}</b> contre <b>${targetName}</b><br><span style="font-size:12px; font-style: italic; color: #555;">Degré : ${degree} (multiplicateur x${multiplier})</span>`,
      content: `
        ${rollHtml}
        <div style="margin-top: 8px; padding-top: 5px; border-top: 2px dashed #4a2c66; text-align: center; background: rgba(74,44,102,0.1); border-radius: 3px; padding-bottom: 5px;">
          <span style="font-size:12px; font-weight:bold; color:#0e3a47; text-transform: uppercase;">Dégâts Magiques Appliqués</span><br>
          <span style="font-size:28px; font-weight:bold; color:#4a2c66; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">${adjustedTotal}</span>
        </div>
      `
    });
  }

  /**
   * Ouvre la boîte de dialogue pour les dégâts magiques manuels
   */
  async promptManualSortilegeDamage(itemId) {
    const sortilege = this.items.get(itemId);
    if (!sortilege) return;

    const dialogContent = `
      <div style="text-align: center; margin-bottom: 10px;">
        <p>Le sortilège <b>${sortilege.name}</b> a touché !</p>
        <p style="font-size: 12px; color: #555;">Choisissez le degré de réussite obtenu :</p>
      </div>
    `;

    new Dialog({
      title: "✨ Dégâts magiques manuels",
      content: dialogContent,
      buttons: {
        partial: {
          label: "Partielle (x0.5)",
          callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite partielle", 0.5)
        },
        standard: {
          label: "Standard (x1)",
          callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite standard", 1)
        },
        major: {
          label: "Majeure (x1.5)",
          callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite majeure", 1.5)
        },
        spectacular: {
          label: "Spectaculaire (x2)",
          callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite spectaculaire", 2)
        }
      },
      default: "standard"
    }, { width: 500 }).render(true);
  }
}