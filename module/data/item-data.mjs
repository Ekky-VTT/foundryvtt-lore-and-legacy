const { HTMLField, NumberField, StringField, ArrayField, BooleanField } = foundry.data.fields;

/**
 * Modèle de données pour les Capacités
 */
export class CapaciteData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      valeur: new NumberField({ initial: 0, min: 0, max: 15, integer: true }),
      attributLie: new StringField({ initial: "caractere" }),
      fortune: new BooleanField({ initial: false }),
      adversite: new BooleanField({ initial: false }),
      passif: new BooleanField({ initial: false }), 
      description: new HTMLField({ initial: "" })
    };
  }
}

/**
 * Modèle de données pour les Traits
 */
export class TraitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      cout: new NumberField({ initial: 0, integer: true }), // Coût en Points de Création
      soigne: new BooleanField({ initial: false }), // NOUVEAU : Coche pour annuler les effets négatifs
      soignable: new BooleanField({ initial: false }) // NOUVEAU : Définit si le trait PEUT être soigné
    };
  }
}

export class TraitSpecialData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    
    return {
      description: new HTMLField({ initial: "" })
    };
  }
}

/**
 * Modèle de données pour les Peuples / Espèces
 */
export class PeupleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    // NOUVEAU : On importe ArrayField en plus du reste
    const { HTMLField, NumberField, StringField, ArrayField } = foundry.data.fields;
    
    return {
      description: new HTMLField({ initial: "" }),
      
      // NOUVEAU : Le tableau qui va stocker les UUIDs (Identifiants Uniques) des Traits
      traits: new ArrayField(new StringField()), 
      
      // On peut garder l'ancien champ texte pour le moment si tu avais déjà tapé des choses, 
      // ou pour ajouter des notes purement textuelles
      traitsRaciaux: new StringField({ initial: "" }), 

      // Les bonus de base
      bonusCaractere: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusDiscernement: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusMaitrise: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusPrestance: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusRobustesse: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusVigueur: new NumberField({ initial: 0, min: 0, integer: true }),
      bonusFortune: new NumberField({ initial: 0, min: 0, integer: true })
    };
  }
}

/**
 * 1. CLASSE MÈRE : L'Équipement de base
 * Tous les objets physiques hériteront de ces champs.
 */
export class EquipementBaseData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField({ initial: "" }),
      encombrement: new NumberField({ initial: 1, min: 0, integer: true }), // Le "Bagage"
      quantite: new NumberField({ initial: 1, min: 0, integer: true }), // Nombre d'objets identiques
      prix: new NumberField({ initial: 0, min: 0, integer: true }), // En Taels
      durabilite: new NumberField({ initial: 10, min: 0, integer: true }), // Durabilité de l'objet
      equipe: new BooleanField({ initial: false }) // Case à cocher "Équipé"
    };
  }
}

/**
 * 2. L'ARME (Hérite de EquipementBaseData)
 */
export class ArmeData extends EquipementBaseData {
  static defineSchema() {
    // On récupère les champs de la classe mère (encombrement, quantite, etc.)
    const baseSchema = super.defineSchema(); 
    
    // Et on y ajoute les spécificités des armes de Lore & Legacy
    return {
      ...baseSchema,
      typeArme: new StringField({ initial: "melee" }), // 'melee' ou 'distance'
      degatsBase: new StringField({ initial: "1D8" }),
      degatsBonus: new NumberField({ initial: 0, integer: true }), // Le "+ X"
      mains: new StringField({ initial: "1M" }), // 1M (une main) ou 2M (deux mains)
      porteeMoyenne: new NumberField({ initial: 20, min: 0, integer: true }),
      porteeMax: new NumberField({ initial: 40, min: 0, integer: true })
    };
  }
}

/**
 * 3. L'ARMURE (Hérite de EquipementBaseData)
 */
export class ArmureData extends EquipementBaseData {
  static defineSchema() {
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      bonusResPhys: new NumberField({ initial: 0, integer: true }),
      type: new StringField({ initial: "legere" }) // 'legere', 'lourde', 'bouclier' ou 'accessoire'
    };
  }
}

/**
 * 4. LE CONSOMMABLE (Hérite de EquipementBaseData)
 */
export class ConsommableData extends EquipementBaseData {
  static defineSchema() {
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      typeConsommable: new StringField({ initial: "potion" }),
      nocivite: new NumberField({ initial: 0, min: 0, integer: true }),
      effet: new StringField({ initial: "" }), // Ex: "+ (1D8+2) PV"
      charges: new NumberField({ initial: 1, min: 0, integer: true }) // Nombre d'utilisations (ex: rations, potions)
    };
  }
}

/**
 * 5. L'ARCANOTECH (Hérite de EquipementBaseData)
 */
export class ArcanotechData extends EquipementBaseData {
  static defineSchema() {
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      mystere: new NumberField({ initial: 10, min: 0, integer: true }),
      identifie: new BooleanField({ initial: false }), // Doit être identifié avant usage
      sousType: new StringField({ initial: "armeMelee" }), // 'armeMelee', 'armeTir', ou 'artefact'
      // Si c'est une arme, on ajoute de quoi stocker les dégâts
      degatsBase: new StringField({ initial: "1D8" }),
      degatsBonus: new NumberField({ initial: 0, integer: true }),
      mains: new StringField({ initial: "1M" }),
      porteeMoyenne: new NumberField({ initial: 20, min: 0, integer: true }),
      porteeMax: new NumberField({ initial: 40, min: 0, integer: true }),
      // Si c'est un artefact, on stocke la durabilité
      durabilite: new NumberField({ initial: 10, min: 0, integer: true })
    };
  }
}

/**
 * 6. LE MATÉRIEL (Hérite de EquipementBaseData)
 * Ex: Ceinture d'outils, Kit de cambriole...
 */
export class MaterielData extends EquipementBaseData {
  static defineSchema() {
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      usagesMax: new NumberField({ initial: 3, min: 0, integer: true })
    };
  }
}

/**
 * 7. LE COMPOSANT (Hérite de EquipementBaseData)
 * Utilisé pour les Logidroïdes, Véhicules ou Implants.
 */
export class ComposantData extends EquipementBaseData {
  static defineSchema() {
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      ddInstallation: new NumberField({ initial: 12, min: 0, integer: true }),
      durabilite: new NumberField({ initial: 10, min: 0, integer: true }),
      effet: new StringField({ initial: "" }) // Pour noter textuellement le bonus, ex: "RAPIDITÉ + 2"
    };
  }
}
