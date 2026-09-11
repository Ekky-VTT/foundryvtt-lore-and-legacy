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
      munitions: new SchemaField({
        balles: new NumberField({ initial: 0, min: 0, integer: true }),
        carreaux: new NumberField({ initial: 0, min: 0, integer: true }),
        fleches: new NumberField({ initial: 0, min: 0, integer: true }),
        flechettes: new NumberField({ initial: 0, min: 0, integer: true }),
        grenades: new NumberField({ initial: 0, min: 0, integer: true })
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
      // Pour gérer les conditions des capacités passives d'armure
      equipementActif: new SchemaField({
        armureLegere: new BooleanField({ initial: false }),
        armureLourde: new BooleanField({ initial: false }),
        bouclier: new BooleanField({ initial: false })
      }),
      // Gestion des États, Poisons, Maladies et Altérations
      status: new SchemaField({
        etats: new SchemaField({
          immobilise: new BooleanField({ initial: false }),
          paralyse: new BooleanField({ initial: false }),
          renverse: new BooleanField({ initial: false }),
          inconscient: new BooleanField({ initial: false }),
          horsCombat: new BooleanField({ initial: false }),
          etatCritique: new BooleanField({ initial: false })
        }),
        poisons: new SchemaField({
          barbouille: new BooleanField({ initial: false }),
          betassou: new BooleanField({ initial: false }),
          carline: new BooleanField({ initial: false }),
          cirage: new BooleanField({ initial: false }),
          encrouteur: new BooleanField({ initial: false }),
          flandbras: new BooleanField({ initial: false }),
          jobardeur: new BooleanField({ initial: false }),
          mochard: new BooleanField({ initial: false }),
          pointmort: new BooleanField({ initial: false }),
          tremblante: new BooleanField({ initial: false })
        }),
        maladies: new SchemaField({
          arguche: new BooleanField({ initial: false }),
          detosse: new BooleanField({ initial: false }),
          drelingue: new BooleanField({ initial: false }),
          drouille: new BooleanField({ initial: false }),
          gringale: new BooleanField({ initial: false }),
          pochetee: new BooleanField({ initial: false }),
          rouscaille: new BooleanField({ initial: false })
        }),
        alteration: new StringField({ initial: "0" })
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

export class VehiculeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { HTMLField, NumberField, SchemaField, StringField, ArrayField } = foundry.data.fields;
    
    return {
      description: new HTMLField({ initial: "" }),
      pv: new SchemaField({
        value: new NumberField({ initial: 20, min: 0, integer: true }),
        max: new NumberField({ initial: 20, min: 0, integer: true })
      }),
      durabilite: new NumberField({ initial: 10, min: 0, integer: true }),
      bagage: new NumberField({ initial: 0, min: 0, integer: true }),
      rapidite: new NumberField({ initial: 10, min: 0, integer: true }),
      maniabilite: new NumberField({ initial: 10, min: 0, integer: true }),
      poids: new NumberField({ initial: 0, min: 0 }), // En kilogrammes ou tonnes
      valeur: new NumberField({ initial: 0, min: 0, integer: true }),
      
      // Un petit tableau manuel simple (comme pour les PNJ) si le véhicule est armé
      armesVehicule: new ArrayField(new SchemaField({
        nom: new StringField({ initial: "" }),
        degats: new StringField({ initial: "1d8" })
      }))
    };
  }
}
