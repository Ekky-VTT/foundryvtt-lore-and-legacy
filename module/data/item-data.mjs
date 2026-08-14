const { NumberField, StringField, HTMLField } = foundry.data.fields;

/**
 * Modèle de données pour les Capacités
 */
export class CapaciteData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      valeur: new NumberField({ initial: 0, min: 0, max: 15, integer: true }),
      attributLie: new StringField({ initial: "caractere" }), // caractere, discernement, maitrise, prestance, robustesse, vigueur, aucun
      description: new HTMLField({ initial: "" })
    };
  }
}
