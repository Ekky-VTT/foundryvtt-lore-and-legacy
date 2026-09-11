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

  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if (this.type !== "personnage" && this.type !== "pnj") return;
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (game.user.id !== userId) return;

    if (this.type === "personnage" || this.type === "pnj") {
      this._syncStatusEffects();
    }
  }

  async _syncStatusEffects() {
    const etats = this.system.status?.etats || {};
    
    // Mapping statut -> ID Foundry v11+
    const statusMap = {
      "immobilise": "stun",
      "paralyse": "paralysis",
      "renverse": "prone",
      "etatCritique": "dead"
    };

    for (const [etatKey, effectId] of Object.entries(statusMap)) {
      const isActive = etats[etatKey] === true;
      const hasEffect = this.statuses.has(effectId);
      if (isActive && !hasEffect) {
        await this.toggleStatusEffect(effectId, { active: true });
      } else if (!isActive && hasEffect) {
        await this.toggleStatusEffect(effectId, { active: false });
      }
    }

    // Traitement spécial pour Inconscient / Hors de Combat (qui partagent "unconscious")
    const shouldBeUnconscious = etats.horsCombat === true || etats.inconscient === true;
    const hasUnconscious = this.statuses.has("unconscious");
    
    if (shouldBeUnconscious && !hasUnconscious) {
      await this.toggleStatusEffect("unconscious", { active: true });
    } else if (!shouldBeUnconscious && hasUnconscious) {
      await this.toggleStatusEffect("unconscious", { active: false });
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

    attr.caractere.total = Number(attr.caractere.value || 0) + Number(bonusPeuple.caractere);
    attr.discernement.total = Number(attr.discernement.value || 0) + Number(bonusPeuple.discernement);
    attr.maitrise.total = Number(attr.maitrise.value || 0) + Number(bonusPeuple.maitrise);
    attr.prestance.total = Number(attr.prestance.value || 0) + Number(bonusPeuple.prestance);
    attr.robustesse.total = Number(attr.robustesse.value || 0) + Number(bonusPeuple.robustesse);
    attr.vigueur.total = Number(attr.vigueur.value || 0) + Number(bonusPeuple.vigueur);
    attr.fortune.total = Number(attr.fortune.max || 0) + Number(bonusPeuple.fortune);

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
    this.flags = { ...(this.flags ?? {}), "lore-and-legacy": { ...(this.flags?.["lore-and-legacy"] ?? {}) } };
    let baseSaut = Math.floor((maitrise + vigueur) / 3);
    
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

        if (nom.includes("baraqué")) attr.vigueur.traitFortune = true;
        if (nom.includes("irréductible")) attr.caractere.traitFortune = true;
        if (nom.includes("petit génie")) attr.discernement.traitFortune = true;
        if (nom.includes("solide comme un roc")) attr.robustesse.traitFortune = true;
        if (nom.includes("vif comme l'éclair")) attr.maitrise.traitFortune = true;
        if (nom.includes("lunaire") && !estSoigne) attr.discernement.traitFortune = true;

        if (nom.includes("candide") && !estSoigne) attr.caractere.traitAdversite = true;
        if (nom.includes("frêle") && !estSoigne) attr.robustesse.traitAdversite = true;
        if (nom.includes("ingénu") && !estSoigne) attr.discernement.traitAdversite = true;
        if (nom.includes("maladroit") && !estSoigne) attr.maitrise.traitAdversite = true;
        if (nom.includes("moche") && !estSoigne) attr.prestance.traitAdversite = true;
        if (nom.includes("rat de bibliothèque") && !estSoigne) attr.vigueur.traitAdversite = true;
        if (nom.includes("lunaire") && !estSoigne) attr.prestance.traitAdversite = true;

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
        if (nom.includes("biomécanique")) {
          bonusResPhysTraits += 2;
          bonusPVTraits += 2;
        }
        if (nom.includes("bête de somme")) bonusBagageTraits += 3;
        if (nom.includes("blindé")) bonusResPhysTraits += 3; 
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

        if (nom.includes("main lourde")) this.flags.mainLourde = true;
        if (nom.includes("poings d'acier")) this.flags.poingsAcier = true;
        if (nom.includes("tireur d'élite")) this.flags.tireurElite = true;
      }
    }
    
    const etats = systemData.status?.etats || {};
    const isImmobilise = etats.immobilise === true;

    for (let key in attr) {
      attr[key].finalFortune = attr[key].fortune || attr[key].traitFortune;
      
      // Variables Tampon pour l'Adversité
      attr[key].forceAdversite = false;
      attr[key].forceAdversiteSources = [];

      if (attr[key].traitAdversite) {
        attr[key].forceAdversite = true;
        attr[key].forceAdversiteSources.push("Trait");
      }

      if (isImmobilise) {
        attr[key].forceAdversite = true;
        attr[key].forceAdversiteSources.push("Immobilisé");
      }

      attr[key].forceAdversiteSourceLabel = attr[key].forceAdversiteSources.join(", ");
      attr[key].finalAdversite = attr[key].adversite || attr[key].forceAdversite;
    }
    
    sec.distanceSaut = baseSaut;
    
    // --- 2. CALCUL DES CARACTÉRISTIQUES SECONDAIRES ---
    // On n'écrase automatiquement ces valeurs que s'il s'agit d'un Personnage Joueur !
    if (this.type === "personnage") {
      sec.pv.max = (robustesse + vigueur) * 2 + bonusEndurance + bonusPVTraits;
      sec.pm.max = (caractere + discernement) + bonusConcentration + (bonusMysticisme * 2) + bonusPMTraits;
      sec.sb.value = (robustesse * 2) + bonusEndurance;
      sec.resMag.value = (discernement + maitrise) * 2 + bonusConcentration + bonusResMagTraits + bonusEsquive;
      sec.resMent.value = (caractere + prestance) * 2 + bonusEspritCritique + bonusResMentTraits;
      
      // --- 2.5 CALCUL DES PROTECTIONS ÉQUIPÉES ET RÉSISTANCE PHYSIQUE ---
      let bonusResPhysAutres = 0;
      let baseLegere = 0;
      let baseLourde = 0;
      let baseBouclier = 0;

      let bonusResMagArmures = 0; 
      let bonusResMentArmures = 0;
      let modRapiditeArmures = 0; 
      let hasArmureLegere = false;
      let isArmureLegereEndommage = false;
      let hasArmureLourde = false;
      let isArmureLourdeEndommage = false;
      let hasBouclier = false;
      let isBouclierEndommage = false;

      for (let item of this.items) {
        if (item.type === "armure" && item.system?.equipe) {
          let currentBonusPhys = Number(item.system.bonusResPhys || 0);
          
          modRapiditeArmures += Number(item.system.modRapidite || 0);
          if (item.system.type === "legere") {
            hasArmureLegere = true;
            baseLegere += currentBonusPhys;
            if (item.system.endommage) isArmureLegereEndommage = true;
          } else if (item.system.type === "lourde") {
            hasArmureLourde = true;
            baseLourde += currentBonusPhys;
            if (item.system.endommage) isArmureLourdeEndommage = true;
          } else if (item.system.type === "bouclier") {
            hasBouclier = true;
            baseBouclier += currentBonusPhys;
            if (item.system.endommage) isBouclierEndommage = true;
          } else {
            // "accessoire" ou autre type inconnu
            if (item.system.endommage) {
              currentBonusPhys = Math.ceil(currentBonusPhys / 2);
            }
            bonusResPhysAutres += currentBonusPhys;
          }

          // ANALYSE TEXTUELLE INTELLIGENTE DES EFFETS (Regex)
          if (item.system.effet) {
            const effStr = String(item.system.effet).toLowerCase();
            
            // Cherche un motif "Magique" associé à un chiffre positif
            const matchMag = effStr.match(/(?:magique|mag).*\+\s*(\d+)/) || effStr.match(/\+\s*(\d+).*(?:magique|mag)/);
            if (matchMag) bonusResMagArmures += Number(matchMag[1]);

            // Cherche un motif "Mentale" associé à un chiffre positif
            const matchMent = effStr.match(/(?:mentale|mental|ment).*\+\s*(\d+)/) || effStr.match(/\+\s*(\d+).*(?:mentale|mental|ment)/);
            if (matchMent) bonusResMentArmures += Number(matchMent[1]);
          }
          // ANALYSE TEXTUELLE INTELLIGENTE DES EFFETS ARCANOTECH (Regex/Mots-clés)
          if (item.type === "arcanotech" && item.system?.equipe && item.system?.effet) {
            const effStr = String(item.system.effet).toLowerCase();
              
            // Détecte les Serres adamantines ou tout objet donnant un bonus similaire
            if (effStr.includes("escalade") && effStr.includes("fortune")) {
              this.flags.fortuneEscalade = true;
            }
          }
        }
      }

      // On calcule la masse corporelle uniquement sur la Robustesse pure et les mutations physiques (Traits)
      let resPhysNaturelle = (robustesse * 3) + (typeof bonusResPhysTraits !== 'undefined' ? bonusResPhysTraits : 0);
      // Le poids est défini AVANT d'ajouter l'agilité (Esquive) et l'équipement
      sec.poids.value = (resPhysNaturelle * 10) + bonusPoidsTraits;

      let resPhysBase = resPhysNaturelle + bonusEsquive + bonusResPhysAutres;
      
      let totalLegere = hasArmureLegere ? baseLegere + bonusArmureLegere : 0;
      if (isArmureLegereEndommage) totalLegere = Math.ceil(totalLegere / 2);
      
      let totalLourde = hasArmureLourde ? baseLourde + bonusArmureLourde : 0;
      if (isArmureLourdeEndommage) totalLourde = Math.ceil(totalLourde / 2);
      
      let totalBouclier = hasBouclier ? baseBouclier + bonusBouclier : 0;
      if (isBouclierEndommage) totalBouclier = Math.ceil(totalBouclier / 2);

      resPhysBase += totalLegere + totalLourde + totalBouclier;

      sec.resPhys.value = resPhysBase;
      // On injecte les bonus trouvés par le Regex directement dans les valeurs finales
      sec.resMag.value += bonusResMagArmures;
      sec.resMent.value += bonusResMentArmures;

      // --- APPLICATION DE LA DÉFENSE TOTALE ---
      if (this.flags["lore-and-legacy"]?.defenseTotale) {
        sec.resPhys.value *= 2;
      }

      // --- CALCUL DU BAGAGE ---
      sec.bagage = sec.bagage || {};
      sec.bagage.max = Math.min(18, 9 + bonusOptimisation + bonusBagageTraits);
      
      sec.bagage.value = this.items.reduce((total, item) => {
        if (item.system && item.system.encombrement !== undefined) {
          const encombrement = Number(item.system.encombrement) || 0;
          const quantite = item.system.quantite !== undefined ? Number(item.system.quantite) : 1;
          return total + (encombrement * quantite);
        }
        return total;
      }, 0);

      sec.bagage.surcharge = sec.bagage.value > sec.bagage.max;

      // Reste des statistiques
      sec.rdc.max = (fortune + vigueur) * multRDC;
      sec.rapidite.value = maitrise + vigueur + bonusRapiditeTraits + modRapiditeArmures;
      sec.sprint.value = sec.rapidite.value * 2;
      // On s'assure que la Rapidité ne tombe pas sous zéro à cause d'une armure trop lourde
      sec.rapidite.value = Math.max(0, sec.rapidite.value);

      // Application de la surcharge de bagage sur la rapidité
      if (sec.bagage.surcharge) {
        sec.rapidite.value = Math.max(1, Math.floor(sec.rapidite.value / 2));
        sec.sprint.value = sec.rapidite.value * 2;
      }
    }

    // --- VARIABLE D'INITIATIVE POUR LE COMBAT TRACKER ---
    // En dehors de la condition, car le Combat Tracker a aussi besoin de lire l'initiative d'un PNJ !
    const tieBreaker = this.type === "personnage" ? 0.1 : 0;
    // On sécurise avec Number() pour garantir que la valeur saisie manuellement par le MJ soit bien un chiffre
    sec.rapidite.initiative = Number(sec.rapidite.value || 0) + tieBreaker;

    // --- 3. STOCKAGE DES BONUS DE MUSCULATION ---
    sec.bonusDegatsCaC = bonusMusculation;
    sec.bonusChargeEffort = Math.ceil(bonusMusculation / 2);
  }

/**
   * Effectue un jet de Capacité (ou d'Attribut en repli)
   * @param {string} itemId - L'ID de l'objet Capacité cliqué
   * @param {Object} options - Options du jet (fortune, adversite, malus)
   */
  async rollCapacite(itemId, options = {}) {
    const capacite = this.items.get(itemId);
    if (!capacite || capacite.type !== "capacite") return;

    const nomCapa = capacite.name.toLowerCase();

    // --- REDIRECTION DES ATTAQUES VERS LES ARMES ÉQUIPÉES ---
    if (nomCapa.includes("combat rapproché") || nomCapa.includes("combat à distance")) {
      const isDistance = nomCapa.includes("combat à distance");
      const isMelee = nomCapa.includes("combat rapproché");

      const armesEquipees = this.items.filter(i => {
        if (!i.system.equipe) return false;
        if (isDistance && ((i.type === "arme" && i.system.typeArme === "distance") || i.system.sousType === "armeTir")) return true;
        if (isMelee && ((i.type === "arme" && i.system.typeArme === "melee") || (i.type === "arcanotech" && i.system.sousType === "armeMelee"))) return true;
        return false;
      });

      if (armesEquipees.length > 0) {
        return this.rollArme(armesEquipees[0].id);
      }
    }

    return this._continueRollCapacite(capacite, nomCapa, options);
  }

  async _continueRollCapacite(capacite, nomCapa, options) {
    const capaciteValue = capacite.system.valeur;
    const attributLieKey = capacite.system.attributLie; 
    
    const attributParent = attributLieKey ? this.system.attributs[attributLieKey] : null;
    const attributValue = attributParent ? attributParent.total : 0;
    const attributNom = attributLieKey ? attributLieKey.charAt(0).toUpperCase() + attributLieKey.slice(1) : "Aucun";

    // --- HÉRITAGE DYNAMIQUE FORTUNE / ADVERSITÉ ---
    // On fusionne les valeurs de la fiche avec celles cochées dans le popup (options)
    let isFortune = capacite.system.fortune || (attributParent && attributParent.finalFortune) || options.fortune;
    let isAdversite = capacite.system.adversite || (attributParent && attributParent.finalAdversite) || options.adversite;

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

    // Cas spécifique du Zazou
    const socialCapacites = ["charme", "intimidation", "provocation", "marchandage", "présence apaisante", "rhétorique", "représentation"];
    if (this.flags?.adversiteSociale && socialCapacites.some(c => nomCapa.includes(c))) {
      isAdversite = true;
    }
    
    // --- LECTURE DE LA CIBLE ---
    const targets = Array.from(game.user.targets);
    let cibleHTML = "";
    
    if (targets.length > 0) {
      const targetActor = targets[0].actor;
      const targetSec = targetActor.system.secondaires;
      const isPJ = targetActor.type === "personnage";
      const displayResPhys = isPJ ? targetSec.resPhys.value : "???";
      const displayResMag = isPJ ? targetSec.resMag.value : "???";
      
      if (nomCapa.includes("combat rapproché") || nomCapa.includes("combat à distance") || nomCapa.includes("charge")) {
        cibleHTML = `<div style="margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.05); border: 1px solid #c19a5b; border-radius: 3px; font-size: 12px; color: #0e3a47;">
          🎯 <b>${targetActor.name}</b> (RÉS. PHYSIQUE : <b>${displayResPhys}</b>)
        </div>`;
      } else if (nomCapa.includes("arcanotech")) {
        cibleHTML = `<div style="margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.05); border: 1px solid #c19a5b; border-radius: 3px; font-size: 12px; color: #0e3a47;">
          🎯 <b>${targetActor.name}</b> (RÉS. MAGIQUE : <b>${displayResMag}</b>)
        </div>`;
      }
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

    // --- APPLICATION DU BONUS DE MUSCULATION (Charge / Effort) ---
    const bonusChargeEffort = Number(this.system.secondaires?.bonusChargeEffort || 0);
    if ((nomCapa.includes("charge") || nomCapa.includes("effort")) && bonusChargeEffort > 0) {
      formula += ` + ${bonusChargeEffort}`;
      flavorText += ` <span style="color:#0e3a47; font-size:11px; font-weight:bold;">[+ Musculation (+${bonusChargeEffort})]</span>`;
    }

    if (isFortune) {
      formula += ` + 1${typeDeDe}[fortune]`;
      flavorText += ` <span style="color:#2a7b36; font-weight:bold;">[+ Fort.]</span>`;
    }

    if (isAdversite) {
      formula += ` - 1${typeDeDe}[adversite]`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[- Adv.]</span>`;
    }

    // --- APPLICATION DU MALUS D'ATTAQUE MULTIPLE ---
    const malus = options.malus || 0;
    if (malus > 0) {
      formula += ` - ${malus}`;
      flavorText += ` <span style="color:#b32424; font-weight:bold;">[-${malus} Attaque Multiple]</span>`;
    }

    // Ajout du bloc de cible à la fin du message
    flavorText += cibleHTML;

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

    if (nomCapa.includes("charge") && targets.length > 0) {
      const targetToken = targets[0];
      const targetActor = targetToken.actor;
      const resistance = Number(targetActor?.system?.secondaires?.resPhys?.value || 0);
      const result = this._getDegreeOfSuccess(roll, resistance, typeDeDe);
      
      let extraText = `<div style="margin-top: 6px; padding: 4px; background: rgba(0,0,0,0.05); border: 1px solid #c19a5b; border-radius: 3px; font-size: 12px; color: #0e3a47;">
        <p><b>${targetActor.name}</b> → <span style="color:${result.success ? "#2b7a4b" : "#b32424"}; font-weight:bold;">${result.degreeLabel}</span></p>`;

      if (result.success) {
        if (["standard", "major", "spectacular"].includes(result.degree)) {
          extraText += `<p style="color: #b32424; font-weight: bold; font-size: 11px;">💥 Cible RENVERSÉE !</p>`;
          // Toggle status 'prone' onto target if they don't have it already
          if (!targetActor.statuses.has("prone")) {
             await targetActor.toggleStatusEffect("prone", { active: true });
          }
        } else if (result.degree === "partial") {
          extraText += `<p style="color: #555; font-style: italic; font-size: 11px;">Dégâts uniquement, la cible n'est pas renversée.</p>`;
        }
      } else {
         extraText += `<p style="color: #555; font-style: italic; font-size: 11px;">La charge échoue.</p>`;
      }
      extraText += `</div>`;
      flavorText += extraText;
    }

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavorText
    });
  }

  async rollAttribut(attrKey, options = {}) {
    if (!this.system.attributs[attrKey]) return;

    const attribut = this.system.attributs[attrKey];
    const attrScore = attribut.total || 0;
    
    const nomsFormates = { caractere: "Caractère", discernement: "Discernement", maitrise: "Maîtrise", prestance: "Prestance", robustesse: "Robustesse", vigueur: "Vigueur", fortune: "Fortune" };
    const nomAffiche = nomsFormates[attrKey] || attrKey;

    let formula = `1d6 + ${attrScore}`;
    let flavorText = options.sortilegeName ? `Jet de Sortilège : <b>${options.sortilegeName}</b> (repli : Discernement)` : `Jet d'Attribut : <b>${nomAffiche}</b>`;

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
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: flavorText });
  }

async rollArme(itemId) {
    const arme = this.items.get(itemId);
    if (!arme || !arme.system.equipe) return;

    let isRafale = false;
    let isLonguePortee = false;
    const isDistance = arme.type === "arme" ? arme.system.typeArme === "distance" : arme.system.sousType === "armeTir";

    // --- 1. GESTION DE LA PORTÉE ET DES MUNITIONS ---
    if (isDistance) {
      const vig = Number(this.system.attributs.vigueur.total || 0);
      const porteeStr = arme.system.portee || "0/0";
      const parts = porteeStr.split('/');
      
      // Traducteur : convertit "Vig x2" ou "20m" en un chiffre exploitable
      const parsePortee = (str) => {
        if (!str) return 0;
        let s = str.toLowerCase().replace(/m/g, '').trim();
        if (s.includes('vig')) {
          let mult = s.match(/x\s*(\d+)/);
          return mult ? vig * parseInt(mult[1]) : vig;
        }
        return parseInt(s) || 0;
      };

      const porteeMoyenne = parsePortee(parts[0]);
      const porteeMax = parsePortee(parts[1] || parts[0]);

      // Vérification des tokens sur la carte
      const activeToken = this.getActiveTokens()[0];
      const targets = [...(game.user.targets || [])];
      const canAutoCalc = activeToken && targets.length > 0;

     if (canAutoCalc) {
        let maxDist = 0;
        for (let t of targets) {
           let dist = 0;
           
           // Nouvelle méthode (Foundry V12+)
           if (canvas.grid.measurePath) {
             dist = canvas.grid.measurePath([activeToken.center, t.center]).distance;
           } 
           // Ancienne méthode (Foundry V11 et inférieur)
           else if (canvas.grid.measureDistances) {
             const ray = new Ray(activeToken.center, t.center);
             dist = canvas.grid.measureDistances([{ ray }], { gridSpaces: true })[0];
           }
           
           if (dist > maxDist) maxDist = dist;
        }
        
        // Bloque le tir si la cible est trop loin (et que la portée max est renseignée)
        if (maxDist > porteeMax && porteeMax > 0) {
           ui.notifications.error(`Cible hors de portée (${Math.round(maxDist)}m > ${porteeMax}m) !`);
           return;
        } else if (maxDist > porteeMoyenne && porteeMoyenne > 0) {
           isLonguePortee = true;
        }
      }

      const tirData = await this._gererTirDistance(arme, canAutoCalc);
      if (!tirData.continue) return; 
      
      isRafale = tirData.isRafale;
      // Si pas de calcul auto, on prend la valeur de la case à cocher
      if (!canAutoCalc && tirData.isLonguePortee) {
         isLonguePortee = true;
      }
    }

    // --- 2. PRÉPARATION DES STATISTIQUES ---
    const isArcanotech = arme.type === "arcanotech";
    const skillName = isArcanotech ? "arcanotech" : arme.system.typeArme === "distance" ? "combat à distance" : "combat rapproché";
    const competence = this.items.find(item => item.type === "capacite" && item.name.toLowerCase().includes(skillName));
    
    const attributKey = competence?.system.attributLie || (isArcanotech ? "discernement" : "maitrise");
    const attribut = this.system.attributs[attributKey] || this.system.attributs.maitrise;
    const score = competence ? Number(competence.system.valeur || 0) : 0;
    const usesAttribute = !competence || score <= 0;
    const baseScore = usesAttribute ? Number(attribut.total || 0) : score;
    const die = usesAttribute ? "d6" : "d10";
    
    let isFortune = competence ? competence.system.fortune || attribut.finalFortune : attribut.finalFortune;
    let isAdversite = competence ? competence.system.adversite || attribut.finalAdversite : attribut.finalAdversite;

    if (isArcanotech && this.flags?.fortuneArcanotech) isFortune = true;
    if (isArcanotech && this.flags?.adversiteArcanotech) isAdversite = true;

    // --- 3. LANCEMENT DES DÉS ---
    const nbTirs = isRafale ? 2 : 1;

    for (let tir = 1; tir <= nbTirs; tir++) {
      let extraFlavor = "";
      
      // On cumule l'Adversité du personnage avec l'Adversité de la longue portée
      let currentAdversite = isAdversite || isLonguePortee;

      if (isLonguePortee && tir === 1) {
        extraFlavor += `<br><span style="color:#b32424; font-weight:bold; font-size:12px;">[🎯 LONGUE PORTÉE : Adversité]</span>`;
      }

      if (isRafale) {
        if (tir === 1) {
          extraFlavor += `<br><span style="color:#0e3a47; font-weight:bold; font-size:12px;">[🔥 TIR EN RAFALE : 1er Tir]</span>`;
        } else if (tir === 2) {
          currentAdversite = true; // Recul de l'arme
          extraFlavor = `<br><span style="color:#b32424; font-weight:bold; font-size:12px;">[🔥 TIR EN RAFALE : 2e Tir (Recul)]</span>`;
        }
      }

      let formula = `1${die} + ${baseScore}`;
      if (isFortune) formula += ` + 1${die}[fortune]`;
      if (currentAdversite) {
        formula = `1${die} + max(0, ${baseScore} - 1${die}[adversite])${isFortune ? ` + 1${die}[fortune]` : ""}`;
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

      const targets = [...(game.user.targets || [])];
      const resistanceKey = isArcanotech ? "resMag" : "resPhys";
      const targetResults = targets.map(token => {
        const targetActor = token.actor;
        const resistance = Number(targetActor?.system?.secondaires?.[resistanceKey]?.value || 0);
        const result = this._getDegreeOfSuccess(roll, resistance, die);
        const targetLabel = targetActor?.name || token.name;
        const damageButton = result.damageMultiplier > 0
          ? `<button type="button" class="lnl-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${arme.id}" data-target-name="${encodeURIComponent(targetLabel)}" data-target-uuid="${token.document.uuid}" data-degree="${result.degree}" data-multiplier="${result.damageMultiplier}"><i class="fas fa-dice-d8"></i> Lancer les dégâts</button>`
          : "";
        return `<p><b>${targetLabel}</b> → <span style="color:${result.success ? "#2b7a4b" : "#b32424"}; font-weight:bold;">${result.degreeLabel}</span>${damageButton}</p>`;
      }).join("");

      const targetFlavor = targetResults || `
        <p style="text-align: center; margin-bottom: 5px; color: #555; font-style: italic;">Aucune cible sélectionnée.</p>
        <button type="button" class="lnl-manual-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${arme.id}">
          <i class="fas fa-bullseye"></i> Lancer les dégâts (Manuel)
        </button>
      `;
      
      const skillLabel = competence ? competence.name : `Attribut : ${attributKey === "discernement" ? "Discernement" : "Maîtrise"} (sans ${skillName})`;
      const weaponLabel = isArcanotech ? `${arme.name} (Arcanotech)` : arme.name;

      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: `Jet d'attaque : <b>${weaponLabel}</b><br>${skillLabel}${extraFlavor}<br>${targetFlavor}`
      });
    }
  }

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
        partial: { label: "Partielle (x0.5)", callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite partielle", 0.5) },
        standard: { label: "Standard (x1)", callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite standard", 1) },
        major: { label: "Majeure (x1.5)", callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite majeure", 1.5) },
        spectacular: { label: "Spectaculaire (x2)", callback: () => this.rollArmeDegats(itemId, "Cible Inconnue", "Réussite spectaculaire", 2) }
      },
      default: "standard"
    }, { width: 500 }).render(true);
  }

  _getDegreeOfSuccess(roll, difficulty, die) {
    const total = Number(roll.total || 0);
    const halfDifficulty = Math.ceil(difficulty / 2);
    const majorDifficulty = Math.ceil(difficulty * 1.5);
    
    const fortuneMax = roll.dice.some(term => term.flavor === "fortune" && Number(term.total) === term.faces);
    const adversityMax = roll.dice.some(term => term.flavor === "adversite" && Number(term.total) === term.faces);

    let degree;
    if (total < halfDifficulty) degree = "failure";
    else if (total < difficulty) degree = "partial";
    else if (total >= majorDifficulty) degree = "major";
    else degree = "standard";

    let isCoupDuSort = false;
    if (fortuneMax && adversityMax) {
      isCoupDuSort = true;
    } else {
      if (["standard", "major"].includes(degree) && fortuneMax) degree = "spectacular";
      else if (["failure", "partial"].includes(degree) && adversityMax) degree = "disastrous";
    }

    const labels = {
      failure: "Échec", partial: "Réussite partielle (effet / 2)", standard: "Réussite standard",
      major: "Réussite majeure (effet x 1,5)", spectacular: "Réussite spectaculaire (effet x 2)", disastrous: "!! ÉCHEC DÉSASTREUX !!"
    };

    let finalLabel = labels[degree];
    if (isCoupDuSort) {
       finalLabel += ` <br><span style="color:#d97711; font-weight:bold; font-size:14px; text-transform:uppercase;">⚡ Coup du Sort ⚡</span>`;
    }

    const multipliers = { failure: 0, partial: 0.5, standard: 1, major: 1.5, spectacular: 2, disastrous: 0 };
    return { degree, degreeLabel: finalLabel, damageMultiplier: multipliers[degree], success: !["failure", "disastrous"].includes(degree) };
  }

async rollArmeDegats(itemId, targetName, degree, multiplier, targetUuid = null) {
    const arme = this.items.get(itemId);
    if (!arme) return;

    let formula = arme.system.degats || "1d8";
    const dieMatch = formula.toLowerCase().match(/d\d+/);
    const die = dieMatch ? `1${dieMatch[0]}` : "1d8";

    let flavorText = `Dégâts : <b>${arme.type === "arcanotech" ? `${arme.name} (Arcanotech)` : arme.name}</b> contre <b>${targetName}</b><br><span style="font-size:12px; font-style: italic; color: #555;">Degré : ${degree} (multiplicateur x${multiplier})</span>`;

    // --- DÉTECTION DU TYPE D'ARME (Déplacée en haut pour servir à tout le monde) ---
    const isMelee = (arme.type === "arme" && arme.system.typeArme === "melee") || 
                    (arme.type === "arcanotech" && arme.system.sousType === "armeMelee");

    // --- APPLICATION DE LA MUSCULATION ---
    const bonusMusculation = Number(this.system.secondaires?.bonusDegatsCaC || 0);
    if (isMelee && bonusMusculation > 0) {
      formula = `(${formula}) + ${bonusMusculation}`;
      flavorText += `<br><span style="color:#0e3a47; font-size:11px; font-weight:bold;">[+ Musculation (+${bonusMusculation})]</span>`;
    }

    // --- GESTION DE L'ARME ENDOMMAGÉE ---
    if (arme.system.endommage) {
      formula = `(${formula}) - ${die}[adversite]`;
      flavorText += `<br><span style="color:#b32424; font-size:11px; font-weight:bold;">[- Adversité (Arme endommagée)]</span>`;
    }

    // --- CORRECTION DU BUG ARCANOTECH ---
    if (arme.type === "arcanotech") {
      const isFortune = arme.system.fortune;
      const isAdversite = arme.system.adversite;

      if (isFortune) {
        formula = `(${formula}) + ${die}[fortune]`;
        flavorText += `<br><span style="color:#2a7b36; font-size:11px; font-weight:bold;">[+ Fortune Arcanique]</span>`;
      }
      
      if (isAdversite) {
        formula = `(${formula}) - ${die}[adversite]`;
        flavorText += `<br><span style="color:#b32424; font-size:11px; font-weight:bold;">[- Adversité (Mal identifié)]</span>`;
      }
    }

    const roll = await new Roll(formula, this.getRollData()).evaluate();
    
    for (const term of roll.dice) {
      if (term.flavor === "fortune") term.options.colorset = "fortune";
      else if (term.flavor === "adversite") term.options.colorset = "adversite";
    }

    let baseDamage = roll.total;

    // --- APPLICATION DU TRAIT MAIN LOURDE ---
    if (this.flags?.mainLourde) {
      const isUnarmed = arme.name.toLowerCase().includes("mains nues") || 
                        arme.name.toLowerCase().includes("poings d'acier") || 
                        arme.name.toLowerCase().includes("morsure");
      
      // S'applique aux armes de mêlée, mais PAS aux attaques naturelles
      // La variable isMelee est lue directement depuis le haut de la méthode
      if (isMelee && !isUnarmed) {
        baseDamage = Math.ceil(baseDamage * 1.5);
        flavorText += `<br><span style="color:#b32424; font-size:11px; font-weight:bold;">[+ Main Lourde (Dégâts x1,5)]</span>`;
      }
    }

    // Calcul final avec le multiplicateur de degré de réussite
    const adjustedTotal = Math.max(0, Math.ceil(baseDamage * Number(multiplier)));
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
          ${targetUuid ? `<button type="button" class="lnl-apply-damage" data-target-uuid="${targetUuid}" data-damage="${adjustedTotal}" style="margin-top: 8px; background: #b32424; color: white; border: none; padding: 5px; border-radius: 3px;"><i class="fas fa-heart-broken"></i> Appliquer aux PV</button>` : ""}
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
      if (term.flavor === "fortune") term.options.colorset = "fortune";
      else if (term.flavor === "adversite") term.options.colorset = "adversite";
    }

    await roll.evaluate();
    roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }), flavor: flavorText });
  }

  async rollSortilege(itemId) {
    const sortilege = this.items.get(itemId);
    if (!sortilege || sortilege.type !== "sortilege") return;

    // --- 1. GESTION DES POINTS DE MAGIE EXTERNALISÉE ---
    const pmData = await this._gererDepensePM(sortilege);
    if (!pmData.continue) return; 

    // 2. Recherche de la capacité Sorcellerie
    const competence = this.items.find(item => item.type === "capacite" && item.name.toLowerCase().includes("sorcellerie"));
    const attribut = this.system.attributs.discernement || { total: 0, finalFortune: false, finalAdversite: false };
    const score = competence ? Number(competence.system.valeur || 0) : 0;
    const usesAttribute = !competence || score <= 0;
    const baseScore = usesAttribute ? Number(attribut.total || 0) : score;
    const die = usesAttribute ? "d6" : "d10";

    let isFortune = competence ? competence.system.fortune || attribut.finalFortune : attribut.finalFortune;
    let isAdversite = competence ? competence.system.adversite || attribut.finalAdversite : attribut.finalAdversite;

    if (this.flags?.fortuneSorcellerie) isFortune = true;

    let formula = `1${die} + ${baseScore}`;
    if (isFortune) formula += ` + 1${die}[fortune]`;
    if (isAdversite) formula = `1${die} + max(0, ${baseScore} - 1${die}[adversite])${isFortune ? ` + 1${die}[fortune]` : ""}`;

    const roll = new Roll(formula);
    for (const term of roll.dice) {
      if (term.flavor === "fortune") term.options.colorset = "fortune";
      else if (term.flavor === "adversite") term.options.colorset = "adversite";
    }

    await roll.evaluate();

    // 3. Détermination de la Difficulté et Cibles
    const isMagiePersonnelle = sortilege.system.typeMagie === "magie-personnelle";
    const isAttack = sortilege.system.sortAttaque === true;
    const nomSort = sortilege.name.toLowerCase();
    const targets = [...(game.user.targets || [])];
    let targetResults = "";

    if (isMagiePersonnelle) {
      const difficulteValue = Number(sortilege.system.difficulte || 8);
      const result = this._getDegreeOfSuccess(roll, difficulteValue, die);
      
      targetResults = `<p><b>Cible : Lui-même</b> → <span style="color:${result.success ? "#2b7a4b" : "#b32424"}; font-weight:bold;">${result.degreeLabel}</span></p>`;

      if (result.success && result.damageMultiplier > 0) {
        if (nomSort.includes("lien éthérique") || nomSort.includes("lien etherique")) {
          const degatsBase = sortilege.system.degatsBase || "1d8";
          const degatsBonus = Number(sortilege.system.degatsBonus) || 0;
          const sign = degatsBonus > 0 ? "+" : "";
          const formulaHeal = `${degatsBase}${degatsBonus ? sign + degatsBonus : ""}`;
          
          const rollHeal = await new Roll(formulaHeal, this.getRollData()).evaluate();
          const finalHeal = Math.max(0, Math.ceil(rollHeal.total * result.damageMultiplier));
          
          const currentPM = this.system.secondaires?.pm?.value || 0;
          const maxPM = this.system.secondaires?.pm?.max || 0;
          const newPM = Math.min(maxPM, currentPM + finalHeal);
          await this.update({ "system.secondaires.pm.value": newPM });
          
          const rollHtml = await rollHeal.render();
          targetResults += `
            <div style="margin-top: 5px; font-size: 13px; border-top: 1px dotted #ccc; padding-top: 5px;">
              <b>Effet (Lien éthérique) :</b>
              ${rollHtml}
              <div style="margin-top: 4px; text-align: center; font-weight: bold; color: #2b7a4b; font-size: 14px;">
                + ${finalHeal} PM restaurés !
              </div>
            </div>`;
        }
      }
    } else if (targets.length > 0) {
      targetResults = targets.map(token => {
        const targetActor = token.actor;
        const targetLabel = targetActor?.name || token.name;
        
        let difficulteValue = 0;
        let difficulteNom = "";

        if (nomSort.includes("brise-os")) {
          difficulteNom = "Résistance physique (x2)";
          difficulteValue = Number(targetActor?.system?.secondaires?.resPhys?.value || 0) * 2;
        } else if (nomSort.includes("éclaboussure") || nomSort.includes("eclaboussure") || nomSort.includes("grêlons") || nomSort.includes("grelons") || nomSort.includes("projectile brûlant") || nomSort.includes("projectile brulant")) {
          difficulteNom = "Résistance physique";
          difficulteValue = Number(targetActor?.system?.secondaires?.resPhys?.value || 0);
        } else {
          const isIllusoire = sortilege.system.typeMagie === "illusoire";
          const resKey = isIllusoire ? "resMent" : "resMag";
          difficulteNom = isIllusoire ? "Résistance mentale" : "Résistance magique";
          difficulteValue = Number(targetActor?.system?.secondaires?.[resKey]?.value || 0);
        }

        const result = this._getDegreeOfSuccess(roll, difficulteValue, die);
        let damageButton = "";
        if (isAttack && result.damageMultiplier > 0) {
          damageButton = `<button type="button" class="lnl-sort-damage-roll" data-actor-uuid="${this.uuid}" data-item-id="${sortilege.id}" data-target-name="${encodeURIComponent(targetLabel)}" data-target-uuid="${token.document.uuid}" data-degree="${result.degree}" data-multiplier="${result.damageMultiplier}"><i class="fas fa-wand-magic-sparkles"></i> Lancer les dégâts magiques</button>`;
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

    const skillLabel = competence ? `Capacité : <b>Sorcellerie</b>` : `Attribut : <b>Discernement</b> (sans Sorcellerie)`;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `Sortilège : <b>${sortilege.name}</b> (${sortilege.system.typeMagie})<br>${skillLabel} | Coût : ${pmData.coutAffiche}<br>${targetResults}`
    });
  }

  async rollSortilegeDegats(itemId, targetName, degree, multiplier, targetUuid = null) {
    const sortilege = this.items.get(itemId);
    if (!sortilege) return;

    let formula = sortilege.system.degatsBase || "1d8";
    if (sortilege.system.degatsBonus) {
      const sign = sortilege.system.degatsBonus > 0 ? "+" : "";
      formula += `${sign}${sortilege.system.degatsBonus}`;
    }
    const roll = await new Roll(formula, this.getRollData()).evaluate();
    const adjustedTotal = Math.max(0, Math.ceil(roll.total * Number(multiplier)));
    const rollHtml = await roll.render();

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      rolls: [roll],
      flavor: `Dégâts magiques : <b>${sortilege.name}</b> contre <b>${targetName}</b><br><span style="font-size:12px; font-style: italic; color: #555;">Degré : ${degree} (multiplicateur x${multiplier})</span>`,
      content: `
        ${rollHtml}
        <div style="margin-top: 8px; padding-top: 5px; border-top: 2px dashed #4a2c66; text-align: center; background: rgba(74,44,102,0.1); border-radius: 3px; padding-bottom: 5px;">
          <span style="font-size:12px; font-weight:bold; color:#0e3a47; text-transform: uppercase;">Dégâts Magiques Finaux</span><br>
          <span style="font-size:28px; font-weight:bold; color:#4a2c66; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">${adjustedTotal}</span>
          ${targetUuid ? `<button type="button" class="lnl-apply-damage" data-target-uuid="${targetUuid}" data-damage="${adjustedTotal}" style="margin-top: 8px; background: #4a2c66; color: white; border: none; padding: 5px; border-radius: 3px;"><i class="fas fa-heart-broken"></i> Appliquer aux PV</button>` : ""}
        </div>
      `
    });
  }

  async rollInvocation(itemId) {
    const invocation = this.items.get(itemId);
    if (!invocation || invocation.type !== "invocation") return;

    // --- 1. GESTION DES POINTS DE MAGIE ---
    // (On réutilise la même méthode intelligente que pour les sorts)
    const pmData = await this._gererDepensePM(invocation);
    if (!pmData.continue) return; 

    // --- 2. RECHERCHE DE LA CAPACITÉ SPIRITISME ---
    const competence = this.items.find(item => item.type === "capacite" && item.name.toLowerCase().includes("spiritisme"));
    const attributKey = competence?.system.attributLie || "discernement"; // Repli par défaut sur Discernement
    const attribut = this.system.attributs[attributKey] || { total: 0, finalFortune: false, finalAdversite: false };
    
    const score = competence ? Number(competence.system.valeur || 0) : 0;
    const usesAttribute = !competence || score <= 0;
    const baseScore = usesAttribute ? Number(attribut.total || 0) : score;
    const die = usesAttribute ? "d6" : "d10";

    let isFortune = competence ? competence.system.fortune || attribut.finalFortune : attribut.finalFortune;
    let isAdversite = competence ? competence.system.adversite || attribut.finalAdversite : attribut.finalAdversite;

    // Application du Trait Animiste (qui donne un drapeau fortuneSpiritisme)
    if (this.flags?.fortuneSpiritisme) isFortune = true;

    // --- 3. LANCEMENT DES DÉS ---
    let formula = `1${die} + ${baseScore}`;
    if (isFortune) formula += ` + 1${die}[fortune]`;
    if (isAdversite) formula = `1${die} + max(0, ${baseScore} - 1${die}[adversite])${isFortune ? ` + 1${die}[fortune]` : ""}`;

    const roll = await new Roll(formula, this.getRollData()).evaluate();
    for (const term of roll.dice) {
      if (term.flavor === "fortune") term.options.colorset = "fortune";
      else if (term.flavor === "adversite") term.options.colorset = "adversite";
    }

    // --- 4. CALCUL DU DEGRÉ DE RÉUSSITE ---
    const difficulte = Number(invocation.system.difficulte || 10);
    const result = this._getDegreeOfSuccess(roll, difficulte, die);

    // --- 5. ADAPTATION DE LA DURÉE ---
    const baseDuree = invocation.system.duree || "1 action";
    let finalDuree = "";
    let successColor = "#0e3a47";

    if (result.degree === "failure" || result.degree === "disastrous") {
      finalDuree = "Échec de l'invocation.";
      successColor = "#b32424";
    } else {
      successColor = "#2b7a4b";
      if (result.degree === "partial") {
        finalDuree = `<b>${baseDuree}</b> (Divisée par 2)`;
      } else if (result.degree === "standard") {
        finalDuree = `<b>${baseDuree}</b> (Normale)`;
      } else if (result.degree === "major") {
        finalDuree = `<b>${baseDuree}</b> (Multipliée par 1,5)`;
      } else if (result.degree === "spectacular") {
        finalDuree = `<b>${baseDuree}</b> (Multipliée par 2)`;
      }
    }

    // --- 6. AFFICHAGE DANS LE CHAT ---
    const skillLabel = competence ? `Capacité : <b>Spiritisme</b>` : `Attribut : <b>${attributKey.charAt(0).toUpperCase() + attributKey.slice(1)}</b> (sans Spiritisme)`;
    const rollHtml = await roll.render();
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `Invocation : <b>${invocation.name}</b><br>${skillLabel} | Coût : ${pmData.coutAffiche}`,
      content: `
        ${rollHtml}
        <div style="margin-top: 8px; padding: 5px; border-top: 2px dashed ${successColor}; text-align: center; background: ${successColor}1A; border-radius: 3px;">
          <span style="font-size:14px; font-weight:bold; color:${successColor};">${result.degreeLabel}</span><br>
          <span style="font-size:12px; font-weight:bold; color:#0e3a47;">Durée résultante : <br>${finalDuree}</span>
        </div>
      `
    });
  }
  
  async promptManualSortilegeDamage(itemId) {
    const sortilege = this.items.get(itemId);
    if (!sortilege) return;

    const dialogContent = `<div style="text-align: center; margin-bottom: 10px;"><p>Le sortilège <b>${sortilege.name}</b> a touché !</p><p style="font-size: 12px; color: #555;">Choisissez le degré de réussite obtenu :</p></div>`;

    new Dialog({
      title: "✨ Dégâts magiques manuels",
      content: dialogContent,
      buttons: {
        partial: { label: "Partielle (x0.5)", callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite partielle", 0.5) },
        standard: { label: "Standard (x1)", callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite standard", 1) },
        major: { label: "Majeure (x1.5)", callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite majeure", 1.5) },
        spectacular: { label: "Spectaculaire (x2)", callback: () => this.rollSortilegeDegats(itemId, "Cible Inconnue", "Réussite spectaculaire", 2) }
      },
      default: "standard"
    }, { width: 500 }).render(true);
  }

/*
* =========================================================================
* MÉTHODE POUR LES CONSOMMABLES (FIOLES, POTIONS, RATIONS, ETC.)
* =========================================================================
*/  
async rollConsommable(itemId) {
    const item = this.items.get(itemId);
    if (!item || item.type !== "consommable") return;

    const effetStr = String(item.system.effet || "").toUpperCase();
    const isPV = effetStr.includes("PV");
    const isPM = effetStr.includes("PM");

    let rollTotal = 0;

    // Extraction intelligente de la formule (ex: "+ (1d8+2) PV" -> "1d8+2")
    const formulaMatch = effetStr.match(/[\d\s\+\-dD\(\)\*\/]+/);
    
    if (formulaMatch) {
      // On conserve les parenthèses, et on nettoie uniquement le signe "+" isolé au début
      const rawFormula = formulaMatch[0].replace(/^\s*\+\s*/, "").trim();
      
      if (rawFormula) {
        const roll = await new Roll(rawFormula, this.getRollData()).evaluate();
        rollTotal = roll.total;
        
        const targetLabel = isPV ? "Points de Vie" : (isPM ? "Points de Magie" : "Effet");
        const color = isPV ? "#b32424" : (isPM ? "#4a2c66" : "#0e3a47");

        const rollHtml = await roll.render();
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this }),
          flavor: `🧪 <b>${this.name}</b> utilise <b>${item.name}</b>`,
          content: `
            ${rollHtml}
            <div style="margin-top: 8px; padding-top: 5px; border-top: 2px dashed ${color}; text-align: center; background: ${color}1A; border-radius: 3px; padding-bottom: 5px;">
              <span style="font-size:12px; font-weight:bold; color:#0e3a47; text-transform: uppercase;">${targetLabel} Restaurés</span><br>
              <span style="font-size:28px; font-weight:bold; color:${color}; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">${rollTotal}</span>
            </div>
          `
        });
      }
    } else {
      // S'il n'y a pas de formule chiffrée, on affiche juste un message narratif
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `🧪 <b>${this.name}</b> utilise <b>${item.name}</b> !`
      });
    }

    // --- APPLICATION AUTOMATIQUE DES SOINS ---
    if (isPV && rollTotal > 0) {
      const pv = this.system.secondaires.pv;
      await this.update({ "system.secondaires.pv.value": Math.min(pv.max, pv.value + rollTotal) });
    }
    if (isPM && rollTotal > 0) {
      const pm = this.system.secondaires.pm;
      await this.update({ "system.secondaires.pm.value": Math.min(pm.max, pm.value + rollTotal) });
    }

    // --- GESTION DE LA SUPPRESSION ---
    if (item.system.illimite) return;

    const charges = Number(item.system.charges) || 1;
    const quantite = Number(item.system.quantite) || 1;

    // Si la fiole contient plusieurs utilisations (rations, élixirs multiples)
    if (charges > 1) {
      await item.update({ "system.charges": charges - 1 });
    } 
    // Au cas où tu empilerais plusieurs fioles sur la même ligne plus tard
    else if (quantite > 1) {
      await item.update({ "system.quantite": quantite - 1 });
    } 
    // Sinon, on détruit l'objet (bouteille vide)
    else {
      await item.delete();
    }

    // Si l'objet est une ration / des vivres
    if (item.system.typeConsommable === "vivres") {
      const isRaffine = item.system.qualite === "raffine";
      const formule = isRaffine ? "1d8+4" : "1d8+2";
      
      const repasRoll = await new Roll(formule).evaluate({async: true});
      const soin = repasRoll.total;
      
      // Soin des PV et PM sans dépasser le maximum
      const sec = this.system.secondaires;
      const nouveauxPV = Math.min(sec.pv.value + soin, sec.pv.max);
      const nouveauxPM = Math.min(sec.pm.value + soin, sec.pm.max);
      
      await this.update({
        "system.secondaires.pv.value": nouveauxPV,
        "system.secondaires.pm.value": nouveauxPM
      });

      // Affichage stylisé dans le Chat
      const rollHtml = await repasRoll.render();
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: `🏕️ <b>${this.name}</b> consomme <b>${item.name}</b> lors d'un Bivouac`,
        content: `
          ${rollHtml}
          <div style="margin-top: 8px; padding-top: 5px; border-top: 2px dashed #2b7a4b; text-align: center; background: rgba(43,122,75,0.1); border-radius: 3px; padding-bottom: 5px;">
            <span style="font-size:12px; font-weight:bold; color:#0e3a47;">RESTAURATION (PV & PM)</span><br>
            <span style="font-size:28px; font-weight:bold; color:#2b7a4b;">${soin}</span>
          </div>
        `
      });

      // Déduction de la charge de vivres
      const charges = Number(item.system.charges) || 1;
      if (charges > 1) {
        await item.update({ "system.charges": charges - 1 });
      } else {
        await item.delete();
      }
      return; // Fin de l'exécution pour les vivres
    }
  }

  // =========================================================================
  // MÉTHODES PRIVÉES (Aident à alléger le code principal)
  // =========================================================================

  /**
   * @private
   * Vérifie les munitions et la portée (automatique ou manuelle via boîte de dialogue)
   */
  async _gererTirDistance(arme, autoCalcActive) {
    const hasAmmo = arme.system.munitionsMax > 0;
    const currentAmmo = arme.system.munitionsActuelles || 0;

    if (hasAmmo && currentAmmo <= 0) {
      ui.notifications.warn(`Le chargeur de ${arme.name} est vide !`);
      return { continue: false };
    }

    const canRafale = arme.system.rafale;
    // On ouvre la boîte de dialogue si la rafale est possible OU si le calcul automatique est impossible
    const needsDialog = canRafale || !autoCalcActive;

    let isRafale = false;
    let isLonguePortee = false;

    if (needsDialog) {
      const choice = await new Promise(resolve => {
        let ammoHtml = hasAmmo ? `<p><i>Munitions actuelles : <b>${currentAmmo} / ${arme.system.munitionsMax}</b></i></p>` : "";
        
        let porteeHtml = "";
        if (!autoCalcActive) {
          // Si pas de tokens sur la grille, on demande au joueur d'évaluer la distance
          porteeHtml = `
            <div style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 3px; border: 1px solid #c19a5b;">
              <label style="display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: bold; cursor: pointer; color: #b32424;">
                <input type="checkbox" id="longue-portee-check"/>
                Cible à longue portée (Adversité)
              </label>
            </div>
          `;
        } else {
          porteeHtml = `<p style="font-size: 11px; color: #555; margin-top: 5px;"><i>Distance calculée sur la carte.</i></p>`;
        }

        let buttons = {};
        if (canRafale && hasAmmo) {
           buttons.normal = { icon: '<i class="fas fa-crosshairs"></i>', label: "Tir Normal (-1)", callback: (html) => resolve({ mode: "normal", html }) };
           buttons.rafale = { icon: '<i class="fas fa-meteor"></i>', label: "Rafale (-4)", callback: (html) => resolve({ mode: "rafale", html }) };
        } else if (hasAmmo) {
           buttons.normal = { icon: '<i class="fas fa-crosshairs"></i>', label: "Tirer (-1)", callback: (html) => resolve({ mode: "normal", html }) };
        } else {
           buttons.normal = { icon: '<i class="fas fa-crosshairs"></i>', label: "Tirer", callback: (html) => resolve({ mode: "normal", html }) };
        }

        new Dialog({
          title: `Tir avec ${arme.name}`,
          content: `<div style="text-align: center; margin-bottom: 10px;">${ammoHtml}${porteeHtml}</div>`,
          buttons: buttons,
          default: "normal",
          close: () => resolve(null)
        }, { width: 350 }).render(true);
      });

      if (!choice) return { continue: false };
      isRafale = choice.mode === "rafale";
      isLonguePortee = choice.html.find('#longue-portee-check').is(':checked');
    }

    // Déduction des munitions
    if (hasAmmo) {
      const ammoCost = isRafale ? 4 : 1;
      if (currentAmmo < ammoCost) {
        ui.notifications.warn(`Pas assez de munitions pour ce tir !`);
        return { continue: false };
      }
      await arme.update({ "system.munitionsActuelles": currentAmmo - ammoCost });
    }

    return { continue: true, isRafale, isLonguePortee };
  }

  /**
   * @private
   * Vérifie et gère la perte de PV/RDC si le sortilège excède les PM
   */
  async _gererDepensePM(sortilege) {
    const coutPM = sortilege.system.typeMagie === "rituelle"
      ? Number(sortilege.system.coutTotal || sortilege.system.coutPM || 1)
      : Number(sortilege.system.coutPM || 1);

    const currentPM = Number(this.system.secondaires?.pm?.value || 0);
    const currentPV = Number(this.system.secondaires?.pv?.value || 0);
    const currentRDC = Number(this.system.secondaires?.rdc?.value || 0);

    let coutAffiche = `<b>${coutPM} PM</b>`;

    if (coutPM <= currentPM) {
      await this.update({ "system.secondaires.pm.value": currentPM - coutPM });
      return { continue: true, coutAffiche };
    }

    const deficit = coutPM - currentPM;
    const proceed = await new Promise((resolve) => {
      new Dialog({
        title: "⚠️ Épuisement Magique",
        content: `
          <div style="text-align: center; margin-bottom: 10px;">
            <h3 style="color: #b32424; margin-bottom: 5px;">Dépassement de PM !</h3>
            <p>Ce sortilège requiert <b>${coutPM} PM</b>, mais il ne reste que <b>${currentPM}</b>.</p>
            <p>Le déficit de <b>${deficit} points</b> sera prélevé sur votre force vitale !</p>
            <p style="margin-top: 10px;"><i>Êtes-vous sûr de sacrifier votre santé ?</i></p>
          </div>
        `,
        buttons: {
          yes: { icon: '<i class="fas fa-skull"></i>', label: "Sacrifier ma santé", callback: () => resolve(true) },
          no: { icon: '<i class="fas fa-times"></i>', label: "Annuler le sort", callback: () => resolve(false) }
        },
        default: "no"
      }, { width: 450 }).render(true);
    });

    if (!proceed) return { continue: false, coutAffiche: "" };

    let newPV = currentPV;
    let newRDC = currentRDC;
    let avertissementSante = "";

    if (deficit <= currentPV) {
      newPV -= deficit;
      coutAffiche = `<b>${currentPM} PM</b> et <span style="color:#b32424; font-weight:bold;">${deficit} PV sacrifiés</span>`;
      if (newPV === 0) avertissementSante = "<br><span style='color:#b32424;'>Le personnage tombe <b>HORS DE COMBAT</b> !</span>";
    } else {
      const deficitRDC = deficit - currentPV;
      newPV = 0;
      newRDC = Math.max(0, currentRDC - deficitRDC);
      coutAffiche = `<b>${currentPM} PM</b>, <span style="color:#b32424; font-weight:bold;">${currentPV} PV</span> et <span style="color:#800000; font-weight:bold;">${deficitRDC} RDC sacrifiés</span>`;
      if (newRDC > 0) avertissementSante = "<br><span style='color:#b32424;'>Le personnage tombe <b>INCONSCIENT</b> !</span>";
      else avertissementSante = "<br><span style='color:#800000; font-weight:bold; text-transform:uppercase;'>État Critique : Aux portes de la mort !</span>";
    }

    await this.update({ "system.secondaires.pm.value": 0, "system.secondaires.pv.value": newPV, "system.secondaires.rdc.value": newRDC });
    return { continue: true, coutAffiche: coutAffiche + avertissementSante };
  }
}