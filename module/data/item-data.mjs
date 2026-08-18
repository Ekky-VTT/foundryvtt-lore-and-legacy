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
      quantite: new NumberField({ initial: 1, min: 0, integer: true }),
      prix: new NumberField({ initial: 0, min: 0, integer: true }), // En Taels
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
      degatsBase: new StringField({ initial: "1D8" }),
      degatsBonus: new NumberField({ initial: 0, integer: true }), // Le "+ X"
      mains: new StringField({ initial: "1M" }), // 1M (une main) ou 2M (deux mains)
      portee: new StringField({ initial: "Mêlée" })
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
      effet: new StringField({ initial: "" }), // Ex: "+ (1D8+2) PV"
      charges: new NumberField({ initial: 1, min: 0, integer: true }) // Nombre d'utilisations (ex: rations, potions)
    };
  }
}
