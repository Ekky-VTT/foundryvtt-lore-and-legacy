const { NumberField, StringField, HTMLField, BooleanField } = foundry.data.fields;

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
