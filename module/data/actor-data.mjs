const { SchemaField, NumberField, StringField, HTMLField, BooleanField } = foundry.data.fields;

// Petite fonction maison pour éviter de répéter le code pour chaque attribut
function creerAttribut() {
  return new SchemaField({
    value: new NumberField({ initial: 1, min: 1, max: 10, integer: true }),
    fortune: new BooleanField({ initial: false }),   
    adversite: new BooleanField({ initial: false })  
  });
}

/**
 * Modèle de données moderne (v14) pour les Personnages
 */
export class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributs: new SchemaField({
        caractere: creerAttribut(),
        discernement: creerAttribut(),
        maitrise: creerAttribut(),
        prestance: creerAttribut(),
        robustesse: creerAttribut(),
        vigueur: creerAttribut(),
        fortune: creerAttribut()
      }),
      secondaires: new SchemaField({
        pv: new SchemaField({ value: new NumberField({ initial: 0 }), max: new NumberField({ initial: 0 }) }),
        pm: new SchemaField({ value: new NumberField({ initial: 0 }), max: new NumberField({ initial: 0 }) }),
        resPhys: new SchemaField({ value: new NumberField({ initial: 0 }) }),
        resMag: new SchemaField({ value: new NumberField({ initial: 0 }) }),
        resMent: new SchemaField({ value: new NumberField({ initial: 0 }) }),
        rdc: new SchemaField({ value: new NumberField({ initial: 0 }), max: new NumberField({ initial: 0 }) }),
        sb: new SchemaField({ value: new NumberField({ initial: 0 }) }),
        rapidite: new SchemaField({ value: new NumberField({ initial: 0 }) }),
        bagage: new SchemaField({ value: new NumberField({ initial: 0 }), max: new NumberField({ initial: 18 }) }),
        poids: new SchemaField({ value: new NumberField({ initial: 0 }) })
      }),
      biographie: new SchemaField({
        concept: new StringField({ initial: "" }),
        notes: new HTMLField({ initial: "" })
      }),
      // NOUVEAU : Pour gérer les conditions des capacités passives d'armure
      equipementActif: new SchemaField({
        armureLegere: new BooleanField({ initial: false }),
        armureLourde: new BooleanField({ initial: false }),
        bouclier: new BooleanField({ initial: false })
      })
    };
  }
}
