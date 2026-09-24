# Catalogue annuel C10

C10 transpose la hiérarchie MOA validée sans modifier les contrats C1-C9. La liste conserve huit colonnes métier et masque les codes techniques. La fiche présente successivement la synthèse annuelle, le besoin, les contenus par occurrence, la préparation QUO VADIS, puis le cadre permanent.

`family_code=FOCO` est une classification historique/statistique introduite par C5-B pour les activités DPS et DAP. Elle ne remplace pas leur domaine métier. Parce que ce sens est ambigu pour la MOA, C10 la masque du cadre courant et la conserve sous `Famille technique` dans les détails internes repliés. La transition READY est annoncée par le service après exécution du même moteur de validation que la mutation, puis revérifiée côté serveur lors de l'action.

Le modèle C1-C9 ne possède pas de catalogue canonique de variantes métier : `variant_code` est un identifiant technique libre du besoin annuel, sans définition ni libellé versionné. C10 n'affiche donc pas de sélecteur et conserve la valeur existante lors d'une mise à jour. Une future UX multi-variante devra partir d'un contrat métier canonique explicite, et non d'une liste frontend.

Le corpus métier exhaustif n'est pas présent dans le dépôt. Les sources disponibles sont la fixture MOA versionnée, les historiques d'exercices, les référentiels Stat.Com et les migrations C1-C9. `scope-annual-catalog-c10-preview.js` produit une preview A-F sans écriture, seed ni promotion automatique. FOBA, FOCO, FOCA, FOSPEC et AUTO restent soumis à validation MOA lorsque leur contrat canonique n'est pas démontré.

Format d'entrée attendu : CSV séparé par des points-virgules avec un libellé (`Événement`, `libelle` ou `modele`), un domaine (`Qui` ou `domaine`), une identité source et, si disponibles, public et code Stat.Com. Le pipeline cible reste source, preview, normalisation, classification, collisions, regroupement, validation MOA, import idempotent et journal de preuve. La sortie expose explicitement `groups` et `collisions`; une liste de collisions vide signifie qu'aucun conflit n'a été détecté, jamais que l'étape a été ignorée.

Aucune migration, écriture opérationnelle, publication d'événement ou modification Auth n'est introduite par C10.
