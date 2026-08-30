const { ArrayField, SchemaField, NumberField, StringField, HTMLField, BooleanField } = foundry.data.fields;

// Petite fonction maison pour éviter de répéter le code pour chaque attribut
function creerAttribut() {
  return new SchemaField({
    value: new NumberField({ initial: 0, min: 0, max: 10, integer: true }),
    total: new NumberField({ initial: 0, integer: true }), // On déclare le total
    fortune: new BooleanField({ initial: false }),   
    adversite: new BooleanField({ initial: false })  
  });
}

/**
 * Modèle de données moderne (v14) pour les Personnages
 */
export class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, BooleanField, StringField, HTMLField } = foundry.data.fields;
    
    return {
      
      taels: new NumberField({ initial: 0, min: 0, integer: true }),
      astres: new NumberField({ initial: 0, min: 0, integer: true }),
      
attributs: new SchemaField({
        caractere: creerAttribut(),
        discernement: creerAttribut(),
        maitrise: creerAttribut(),
        prestance: creerAttribut(),
        robustesse: creerAttribut(),
        vigueur: creerAttribut(),
        fortune: new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 0, min: 0, max: 10, integer: true }),
          total: new NumberField({ initial: 0, integer: true }), // NOUVEAU : On déclare le total pour la fortune
          fortune: new BooleanField({ initial: false }),
          adversite: new BooleanField({ initial: false })
        })
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
        sprint: new SchemaField({ value: new NumberField({ initial: 0 }) }),
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

export class PNJData extends PersonnageData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armesPNJ: new ArrayField(new SchemaField({
        nom: new StringField({ initial: "" }),
        cd: new NumberField({ initial: 0, integer: true })
      })),
      indiceDanger: new foundry.data.fields.NumberField({ initial: 0, min: 0, integer: true }),
      pouvoirsPNJ: new ArrayField(new SchemaField({
        nom: new StringField({ initial: "" })
      })),
    };
  }
}
