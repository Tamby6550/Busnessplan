<?php

namespace App\Service;

/**
 * Génère le nom d'une copie, sur le modèle de l'explorateur de fichiers Windows.
 *
 * Règle unique, appliquée aussi bien aux projets qu'aux entreprises pour rester
 * homogène d'un bout à l'autre de l'application :
 *
 *   "Angovo"        -> "Angovo-copie"
 *   déjà pris       -> "Angovo-copie(1)", "Angovo-copie(2)", ...
 *   "Angovo-copie"  -> "Angovo-copie-copie"
 *
 * On repart toujours du nom source tel quel : on n'essaie pas de deviner qu'un nom
 * se termine déjà par "-copie", justement pour que la duplication d'une copie donne
 * "-copie-copie" comme dans un gestionnaire de fichiers.
 */
class CopyNameGenerator
{
    public const SUFFIX = '-copie';

    /** Longueur max de la colonne `name` (projets et entreprises) */
    private const MAX_LENGTH = 255;

    /**
     * Nom d'une copie : nom source + suffixe, rendu unique parmi les noms existants.
     *
     * @param string[] $existingNames Noms déjà utilisés dans le même conteneur
     *                                (les autres projets, ou les entreprises du projet cible)
     */
    public function forCopy(string $sourceName, array $existingNames): string
    {
        return $this->makeUnique(trim($sourceName) . self::SUFFIX, $existingNames);
    }

    /**
     * Rend un nom unique sans y ajouter de suffixe de copie.
     * Utilisé quand l'utilisateur a saisi lui-même le nom dans la modale : on respecte
     * sa saisie, et on n'ajoute "(n)" que si ce nom est déjà pris dans le projet cible.
     *
     * @param string[] $existingNames
     */
    public function makeUnique(string $wantedName, array $existingNames): string
    {
        $taken = [];
        foreach ($existingNames as $name) {
            $taken[$this->key((string) $name)] = true;
        }

        $base = trim($wantedName);
        if ($base === '') {
            $base = 'Sans nom';
        }
        $base = $this->truncate($base);

        if (!isset($taken[$this->key($base)])) {
            return $base;
        }

        for ($i = 1; $i <= 1000; $i++) {
            $suffix    = '(' . $i . ')';
            $candidate = $this->truncate($base, mb_strlen($suffix)) . $suffix;
            if (!isset($taken[$this->key($candidate)])) {
                return $candidate;
            }
        }

        // Garde-fou : au-delà de 1000 copies, on garantit l'unicité par l'horodatage.
        $suffix = '(' . time() . ')';

        return $this->truncate($base, mb_strlen($suffix)) . $suffix;
    }

    /** Comparaison insensible à la casse et aux espaces de bord. */
    private function key(string $name): string
    {
        return mb_strtolower(trim($name));
    }

    /** Empêche de dépasser la taille de la colonne en base. */
    private function truncate(string $name, int $reserved = 0): string
    {
        $max = self::MAX_LENGTH - $reserved;

        return mb_strlen($name) > $max ? mb_substr($name, 0, $max) : $name;
    }
}
