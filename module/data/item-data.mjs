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
